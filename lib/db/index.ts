import { and, count, eq, isNull } from "drizzle-orm";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/libsql";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";
import {
  departments,
  positions,
  requestTypes,
  requestAssignees,
  requestSteps,
  requests,
  routeSteps,
  users,
} from "./schema";

export const DEFAULT_POSITION_NAME = "Manager";
export const DEFAULT_REQUEST_TYPES = ["Purchase", "Reimbursement", "Travel", "Other"];
export const SEED_ADMIN_EMAIL = "admin@company.test";
export const SEED_ADMIN_PASSWORD = "password123";

function databaseUrl() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return `file:${path.join(dataDir, "reqpro.db").replaceAll("\\", "/")}`;
}

export const dbClient = createClient({ url: databaseUrl() });
export const db = drizzle(dbClient, { schema });

let schemaReady: Promise<void> | null = null;

async function columnExists(table: string, column: string) {
  const info = await dbClient.execute(`PRAGMA table_info(${table})`);
  return info.rows.some((row) => row.name === column);
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  if (!(await columnExists(table, column))) {
    await dbClient.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function createTables() {
  await dbClient.executeMultiple(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      position_id TEXT,
      department_id TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS route_steps (
      id TEXT PRIMARY KEY,
      sort_order INTEGER NOT NULL,
      kind TEXT NOT NULL,
      position_id TEXT NOT NULL,
      rule TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_number_seq (
      year INTEGER PRIMARY KEY,
      last_value INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      number TEXT UNIQUE,
      title TEXT NOT NULL,
      requester_name TEXT NOT NULL,
      department TEXT NOT NULL,
      type TEXT,
      details TEXT NOT NULL,
      amount REAL,
      currency TEXT,
      status TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      current_step_order INTEGER,
      send_back_reason TEXT,
      decided_by TEXT,
      decided_at INTEGER,
      rejection_reason TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_steps (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      kind TEXT NOT NULL,
      position_id TEXT NOT NULL,
      position_name TEXT NOT NULL,
      rule TEXT NOT NULL,
      state TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_assignees (
      id TEXT PRIMARY KEY,
      request_step_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      completed INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_actions (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      request_step_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      comment TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS request_attachments (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS requests_submitted_by_idx ON requests (submitted_by);
    CREATE INDEX IF NOT EXISTS requests_status_idx ON requests (status);
    CREATE INDEX IF NOT EXISTS request_steps_request_idx ON request_steps (request_id);
    CREATE INDEX IF NOT EXISTS request_assignees_user_idx ON request_assignees (user_id);
    CREATE INDEX IF NOT EXISTS request_assignees_step_idx ON request_assignees (request_step_id);
    CREATE INDEX IF NOT EXISTS request_actions_request_idx ON request_actions (request_id);
    CREATE INDEX IF NOT EXISTS request_attachments_request_idx ON request_attachments (request_id);
    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      request_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS system_logs_created_idx ON system_logs (created_at, id);
  `);

  await addColumnIfMissing("users", "position_id", "TEXT");
  await addColumnIfMissing("users", "department_id", "TEXT");
  await addColumnIfMissing("users", "active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing("positions", "active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing("departments", "active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing("requests", "current_step_order", "INTEGER");
  await addColumnIfMissing("requests", "send_back_reason", "TEXT");
  await addColumnIfMissing("requests", "currency", "TEXT");
  await addColumnIfMissing("requests", "type", "TEXT");
  await addColumnIfMissing("requests", "number", "TEXT");
  await dbClient.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS requests_number_unique ON requests(number)",
  );
  await dbClient.execute("UPDATE users SET role = 'admin' WHERE role = 'manager'");
  await dbClient.execute("UPDATE users SET role = 'member' WHERE role = 'employee'");

  await seedDefaults();
  await seedDepartments();
  await seedRequestTypes();
  const { backfillSystemLogs } = await import("@/lib/system-log");
  await backfillSystemLogs();
  const { backfillRequestNumbers } = await import("@/lib/request-number");
  await backfillRequestNumbers();
}

async function seedDepartments() {
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);

  const existing = await db.select().from(departments);
  if (existing.length > 0) return;

  const known = new Set<string>();
  const requestRows = await db.select({ department: requests.department }).from(requests);

  for (const row of requestRows) {
    const name = row.department.trim();
    if (!name || known.has(name)) continue;
    await db.insert(departments).values({
      id: crypto.randomUUID(),
      name,
      active: true,
      createdAt: new Date(),
    });
    known.add(name);
  }
}

async function seedRequestTypes() {
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS request_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);

  const existing = await db.select().from(requestTypes);
  if (existing.length > 0) return;

  for (const name of DEFAULT_REQUEST_TYPES) {
    await db.insert(requestTypes).values({
      id: crypto.randomUUID(),
      name,
      active: true,
      createdAt: new Date(),
    });
  }
}

async function seedDefaults() {
  let [managerPosition] = await db
    .select()
    .from(positions)
    .where(eq(positions.name, DEFAULT_POSITION_NAME))
    .limit(1);

  if (!managerPosition) {
    const id = crypto.randomUUID();
    await db.insert(positions).values({
      id,
      name: DEFAULT_POSITION_NAME,
      active: true,
      createdAt: new Date(),
    });
    [managerPosition] = await db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);
  }

  if (!managerPosition) return;

  await seedAdmin(managerPosition.id);

  await db
    .update(users)
    .set({ positionId: managerPosition.id })
    .where(and(eq(users.role, "admin"), isNull(users.positionId)));

  const existingSteps = await db.select().from(routeSteps).limit(1);
  if (existingSteps.length === 0) {
    await db.insert(routeSteps).values({
      id: crypto.randomUUID(),
      sortOrder: 0,
      kind: "approve",
      positionId: managerPosition.id,
      rule: "at_least_1",
    });
  }

  const openRequests = await db
    .select()
    .from(requests)
    .where(eq(requests.status, "pending"));

  const route = await db.select().from(routeSteps);
  const positionRows = await db.select().from(positions);
  const positionName = new Map(positionRows.map((row) => [row.id, row.name]));

  for (const request of openRequests) {
    const [existing] = await db
      .select({ id: requestSteps.id })
      .from(requestSteps)
      .where(eq(requestSteps.requestId, request.id))
      .limit(1);
    if (existing || route.length === 0) continue;

    const first = [...route].sort((a, b) => a.sortOrder - b.sortOrder)[0];
    for (const step of route) {
      const stepId = crypto.randomUUID();
      const isFirst = step.id === first.id;
      await db.insert(requestSteps).values({
        id: stepId,
        requestId: request.id,
        sortOrder: step.sortOrder,
        kind: step.kind,
        positionId: step.positionId,
        positionName: positionName.get(step.positionId) ?? "Unknown",
        rule: step.rule,
        state: isFirst ? "active" : "pending",
      });

      if (!isFirst) continue;

      const holders = await db
        .select()
        .from(users)
        .where(and(eq(users.positionId, step.positionId), eq(users.active, true)));

      for (const holder of holders) {
        if (holder.id === request.submittedBy) continue;
        await db.insert(requestAssignees).values({
          id: crypto.randomUUID(),
          requestStepId: stepId,
          userId: holder.id,
          completed: false,
        });
      }

      await db
        .update(requests)
        .set({ currentStepOrder: step.sortOrder })
        .where(eq(requests.id, request.id));
    }
  }
}

async function seedAdmin(positionId: string) {
  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  if (userCount > 0) return;

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: "Admin",
    email: SEED_ADMIN_EMAIL,
    passwordHash: await bcrypt.hash(SEED_ADMIN_PASSWORD, 12),
    role: "admin",
    positionId,
    active: true,
    createdAt: new Date(),
  });
}

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = createTables();
  }
  await schemaReady;
  await addColumnIfMissing("users", "department_id", "TEXT");
  await addColumnIfMissing("users", "active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing("positions", "active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing("departments", "active", "INTEGER NOT NULL DEFAULT 1");
  await addColumnIfMissing("requests", "currency", "TEXT");
  await addColumnIfMissing("requests", "type", "TEXT");
  await addColumnIfMissing("requests", "number", "TEXT");
  await seedDepartments();
  await seedRequestTypes();
  await dbClient.executeMultiple(`
    CREATE TABLE IF NOT EXISTS request_number_seq (
      year INTEGER PRIMARY KEY,
      last_value INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS requests_number_unique ON requests(number);
    CREATE TABLE IF NOT EXISTS system_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_name TEXT NOT NULL,
      action TEXT NOT NULL,
      summary TEXT NOT NULL,
      request_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS system_logs_created_idx ON system_logs (created_at, id);
  `);
  const { backfillSystemLogs } = await import("@/lib/system-log");
  await backfillSystemLogs();
  const { backfillRequestNumbers } = await import("@/lib/request-number");
  await backfillRequestNumbers();
}

export async function getDefaultPositionId() {
  await ensureSchema();
  const [row] = await db
    .select()
    .from(positions)
    .where(eq(positions.name, DEFAULT_POSITION_NAME))
    .limit(1);
  return row?.id ?? null;
}
