import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  requestActions,
  requests,
  systemLogs,
  users,
  type StepAction,
} from "@/lib/db/schema";
import { logCursorSchema } from "@/lib/validations";

export const LOG_PAGE_SIZE = 50;

export type SystemLogCategory = "Request" | "People" | "Settings" | "Account";

export type SystemLogItem = {
  id: string;
  actorName: string;
  action: string;
  summary: string;
  requestId: string | null;
  requestNumber: string | null;
  createdAt: number;
  category: SystemLogCategory;
};

export type SystemLogPage = {
  items: SystemLogItem[];
  nextCursor: string | null;
};

type LogActor = { id: string; name: string };

const requestVerbs: Record<StepAction, string> = {
  passed: "Passed",
  approved: "Approved",
  sent_back: "Sent back",
  rejected: "Rejected",
  retracted: "Retracted",
};

export function logCategory(action: string): SystemLogCategory {
  if (action.startsWith("request.")) return "Request";
  if (action.startsWith("person.")) return "People";
  if (action.startsWith("account.")) return "Account";
  return "Settings";
}

export function requestTitle(title: string) {
  return `"${title}"`;
}

export function requestRef(title: string, number?: string | null) {
  return number ? `${number} ${requestTitle(title)}` : requestTitle(title);
}

export function requestActionSummary(
  action: StepAction,
  title: string,
  comment?: string | null,
  number?: string | null,
) {
  return withReason(`${requestVerbs[action]} ${requestRef(title, number)}`, comment);
}

function withReason(summary: string, comment?: string | null) {
  const reason = comment?.trim();
  if (!reason) return summary;
  const clipped = reason.length > 140 ? `${reason.slice(0, 137)}…` : reason;
  return `${summary} — ${clipped}`;
}

export async function writeSystemLog(input: {
  actor: LogActor | null;
  action: string;
  summary: string;
  requestId?: string | null;
  createdAt?: Date;
}) {
  const summary = input.summary.trim().slice(0, 500);
  if (!summary) return;

  try {
    await db.insert(systemLogs).values({
      id: crypto.randomUUID(),
      actorId: input.actor?.id ?? null,
      actorName: input.actor?.name.trim() || "System",
      action: input.action,
      summary,
      requestId: input.requestId ?? null,
      createdAt: input.createdAt ?? new Date(),
    });
  } catch (error) {
    console.error("Failed to write system log.", error);
  }
}

function encodeCursor(item: { createdAt: Date; id: string }) {
  return `${item.createdAt.getTime()}:${item.id}`;
}

function decodeCursor(cursor: string) {
  const parsed = logCursorSchema.safeParse(cursor);
  if (!parsed.success) return null;
  const [time, id] = parsed.data.split(":");
  return { createdAt: new Date(Number(time)), id };
}

function toItem(
  row: typeof systemLogs.$inferSelect,
  requestNumber: string | null = null,
): SystemLogItem {
  return {
    id: row.id,
    actorName: row.actorName,
    action: row.action,
    summary: row.summary,
    requestId: row.requestId,
    requestNumber,
    createdAt: row.createdAt.getTime(),
    category: logCategory(row.action),
  };
}

export async function listSystemLogs(cursor?: string | null): Promise<SystemLogPage> {
  const after = cursor ? decodeCursor(cursor) : null;
  if (cursor && !after) {
    return { items: [], nextCursor: null };
  }

  const rows = await db
    .select()
    .from(systemLogs)
    .where(
      after
        ? or(
            lt(systemLogs.createdAt, after.createdAt),
            and(eq(systemLogs.createdAt, after.createdAt), lt(systemLogs.id, after.id)),
          )
        : undefined,
    )
    .orderBy(desc(systemLogs.createdAt), desc(systemLogs.id))
    .limit(LOG_PAGE_SIZE + 1);

  const page = rows.slice(0, LOG_PAGE_SIZE);
  const last = page.at(-1);
  const requestIds = [
    ...new Set(page.map((row) => row.requestId).filter((id): id is string => Boolean(id))),
  ];
  const numbered =
    requestIds.length > 0
      ? await db
          .select({ id: requests.id, number: requests.number })
          .from(requests)
          .where(inArray(requests.id, requestIds))
      : [];
  const numbers = new Map(numbered.map((row) => [row.id, row.number ?? null]));

  return {
    items: page.map((row) => toItem(row, row.requestId ? (numbers.get(row.requestId) ?? null) : null)),
    nextCursor: rows.length > LOG_PAGE_SIZE && last ? encodeCursor(last) : null,
  };
}

export async function backfillSystemLogs() {
  const [existing] = await db
    .select({ id: systemLogs.id })
    .from(systemLogs)
    .limit(1);
  if (existing) return;

  const requestRows = await db.select().from(requests);
  const actionRows = await db.select().from(requestActions);
  if (requestRows.length === 0 && actionRows.length === 0) return;

  const people = await db
    .select({
      id: users.id,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users);
  const names = new Map(people.map((row) => [row.id, row.name]));

  const rows: (typeof systemLogs.$inferInsert)[] = [];

  for (const person of people) {
    rows.push({
      id: crypto.randomUUID(),
      actorId: person.id,
      actorName: person.name,
      action: "account.created",
      summary: "Created an account",
      requestId: null,
      createdAt: person.createdAt,
    });
  }

  for (const request of requestRows) {
    rows.push({
      id: crypto.randomUUID(),
      actorId: request.submittedBy,
      actorName: names.get(request.submittedBy) ?? request.requesterName,
      action: "request.submitted",
      summary: `Submitted ${requestTitle(request.title)}`,
      requestId: request.id,
      createdAt: request.createdAt,
    });

    if (request.status === "withdrawn") {
      const actorId = request.decidedBy ?? request.submittedBy;
      rows.push({
        id: crypto.randomUUID(),
        actorId,
        actorName: names.get(actorId) ?? request.requesterName,
        action: "request.withdrawn",
        summary: `Withdrew ${requestTitle(request.title)}`,
        requestId: request.id,
        createdAt: request.decidedAt ?? request.createdAt,
      });
    }
  }

  for (const action of actionRows) {
    const request = requestRows.find((row) => row.id === action.requestId);
    if (!request) continue;
    rows.push({
      id: crypto.randomUUID(),
      actorId: action.userId,
      actorName: names.get(action.userId) ?? "Unknown",
      action: `request.${action.action}`,
      summary: requestActionSummary(action.action, request.title, action.comment),
      requestId: request.id,
      createdAt: action.createdAt,
    });
  }

  if (rows.length === 0) return;
  await db.insert(systemLogs).values(rows);
}
