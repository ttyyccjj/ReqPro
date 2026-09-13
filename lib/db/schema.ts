import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const positions = sqliteTable("positions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const requestTypes = sqliteTable("request_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const departments = sqliteTable("departments", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["member", "admin"] }).notNull(),
  positionId: text("position_id").references(() => positions.id),
  departmentId: text("department_id").references(() => departments.id),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const routeSteps = sqliteTable("route_steps", {
  id: text("id").primaryKey(),
  sortOrder: integer("sort_order").notNull(),
  kind: text("kind", { enum: ["review", "approve"] }).notNull(),
  positionId: text("position_id")
    .notNull()
    .references(() => positions.id),
  rule: text("rule", { enum: ["at_least_1", "everyone"] }).notNull(),
});

export const requestNumberSeq = sqliteTable("request_number_seq", {
  year: integer("year").primaryKey(),
  lastValue: integer("last_value").notNull(),
});

export const requests = sqliteTable("requests", {
  id: text("id").primaryKey(),
  number: text("number").unique(),
  title: text("title").notNull(),
  requesterName: text("requester_name").notNull(),
  department: text("department").notNull(),
  type: text("type"),
  details: text("details").notNull(),
  amount: real("amount"),
  currency: text("currency", { enum: ["PHP", "JPY"] }),
  status: text("status", {
    enum: ["pending", "changes_requested", "approved", "rejected", "withdrawn"],
  }).notNull(),
  submittedBy: text("submitted_by")
    .notNull()
    .references(() => users.id),
  currentStepOrder: integer("current_step_order"),
  sendBackReason: text("send_back_reason"),
  decidedBy: text("decided_by").references(() => users.id),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
  rejectionReason: text("rejection_reason"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const requestSteps = sqliteTable("request_steps", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => requests.id),
  sortOrder: integer("sort_order").notNull(),
  kind: text("kind", { enum: ["review", "approve"] }).notNull(),
  positionId: text("position_id").notNull(),
  positionName: text("position_name").notNull(),
  rule: text("rule", { enum: ["at_least_1", "everyone"] }).notNull(),
  state: text("state", {
    enum: ["pending", "active", "passed", "skipped"],
  }).notNull(),
});

export const requestAssignees = sqliteTable("request_assignees", {
  id: text("id").primaryKey(),
  requestStepId: text("request_step_id")
    .notNull()
    .references(() => requestSteps.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  completed: integer("completed", { mode: "boolean" }).notNull(),
});

export const requestAttachments = sqliteTable("request_attachments", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => requests.id),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const systemLogs = sqliteTable("system_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  summary: text("summary").notNull(),
  requestId: text("request_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const requestActions = sqliteTable("request_actions", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => requests.id),
  requestStepId: text("request_step_id")
    .notNull()
    .references(() => requestSteps.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  action: text("action", {
    enum: ["passed", "approved", "sent_back", "rejected", "retracted"],
  }).notNull(),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Position = typeof positions.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type RequestType = typeof requestTypes.$inferSelect;
export type User = typeof users.$inferSelect;
export type RouteStep = typeof routeSteps.$inferSelect;
export type Request = typeof requests.$inferSelect;
export type RequestStep = typeof requestSteps.$inferSelect;
export type RequestAssignee = typeof requestAssignees.$inferSelect;
export type RequestAction = typeof requestActions.$inferSelect;
export type RequestAttachment = typeof requestAttachments.$inferSelect;
export type SystemLog = typeof systemLogs.$inferSelect;
export type Role = User["role"];
export type RequestStatus = Request["status"];
export type RequestCurrency = NonNullable<Request["currency"]>;
export type StepKind = RouteStep["kind"];
export type StepRule = RouteStep["rule"];
export type StepState = RequestStep["state"];
export type StepAction = RequestAction["action"];
