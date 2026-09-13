import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requestAssignees, requestSteps, requests, type User } from "@/lib/db/schema";

export async function canAccessRequest(user: Pick<User, "id" | "role">, requestId: string) {
  const [request] = await db
    .select({ submittedBy: requests.submittedBy })
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!request) return false;
  if (user.role === "admin" || request.submittedBy === user.id) return true;

  const [assignee] = await db
    .select({ id: requestAssignees.id })
    .from(requestAssignees)
    .innerJoin(requestSteps, eq(requestAssignees.requestStepId, requestSteps.id))
    .where(and(eq(requestSteps.requestId, requestId), eq(requestAssignees.userId, user.id)))
    .limit(1);

  return Boolean(assignee);
}
