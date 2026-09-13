import { and, count, eq, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { requestAssignees, requestSteps, requests } from "@/lib/db/schema";

export function inboxWaitingOn(userId: string): SQL {
  return and(
    eq(requestAssignees.userId, userId),
    eq(requestAssignees.completed, false),
    eq(requestSteps.state, "active"),
    eq(requests.status, "pending"),
  )!;
}

export async function countInboxFor(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(requestAssignees)
    .innerJoin(requestSteps, eq(requestAssignees.requestStepId, requestSteps.id))
    .innerJoin(requests, eq(requestSteps.requestId, requests.id))
    .where(inboxWaitingOn(userId));

  return row?.value ?? 0;
}
