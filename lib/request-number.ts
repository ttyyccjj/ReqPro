import { asc, eq } from "drizzle-orm";
import { db, dbClient } from "@/lib/db";
import { requestNumberSeq, requests } from "@/lib/db/schema";

const NUMBER_PATTERN = /^REQ-(\d{4})-(\d+)$/;

export function formatRequestNumber(year: number, value: number) {
  return `REQ-${year}-${String(value).padStart(4, "0")}`;
}

export function parseRequestNumber(number: string | null | undefined) {
  if (!number) return null;
  const match = NUMBER_PATTERN.exec(number);
  if (!match) return null;
  return { year: Number(match[1]), value: Number(match[2]) };
}

export async function nextRequestNumber(at = new Date()) {
  const year = at.getFullYear();
  const result = await dbClient.execute({
    sql: `INSERT INTO request_number_seq (year, last_value) VALUES (?, 1)
          ON CONFLICT(year) DO UPDATE SET last_value = last_value + 1
          RETURNING last_value`,
    args: [year],
  });
  const value = Number(result.rows[0]?.last_value);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Could not assign a request number.");
  }
  return formatRequestNumber(year, value);
}

export async function backfillRequestNumbers() {
  const rows = await db
    .select({
      id: requests.id,
      number: requests.number,
      createdAt: requests.createdAt,
    })
    .from(requests)
    .orderBy(asc(requests.createdAt), asc(requests.id));

  const maxByYear = new Map<number, number>();

  const seqRows = await db.select().from(requestNumberSeq);
  for (const row of seqRows) {
    maxByYear.set(row.year, Math.max(maxByYear.get(row.year) ?? 0, row.lastValue));
  }

  for (const row of rows) {
    const parsed = parseRequestNumber(row.number);
    if (!parsed) continue;
    maxByYear.set(parsed.year, Math.max(maxByYear.get(parsed.year) ?? 0, parsed.value));
  }

  for (const row of rows) {
    if (row.number) continue;
    const year = row.createdAt.getFullYear();
    const next = (maxByYear.get(year) ?? 0) + 1;
    maxByYear.set(year, next);
    await db
      .update(requests)
      .set({ number: formatRequestNumber(year, next) })
      .where(eq(requests.id, row.id));
  }

  for (const [year, lastValue] of maxByYear) {
    await dbClient.execute({
      sql: `INSERT INTO request_number_seq (year, last_value) VALUES (?, ?)
            ON CONFLICT(year) DO UPDATE SET last_value = MAX(last_value, excluded.last_value)`,
      args: [year, lastValue],
    });
  }
}
