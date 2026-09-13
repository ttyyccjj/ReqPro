"use server";

import { requireAdmin } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import { listSystemLogs, type SystemLogPage } from "@/lib/system-log";

export async function loadMoreLogs(cursor: string): Promise<SystemLogPage> {
  await requireAdmin();
  await ensureSchema();
  return listSystemLogs(cursor);
}

export async function listLogsPage() {
  await requireAdmin();
  await ensureSchema();
  return listSystemLogs();
}
