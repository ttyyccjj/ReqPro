import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, ensureSchema } from "@/lib/db";
import { notifyAssigneesOfTurn, notifyRequesterOutcome } from "@/lib/request-mail";
import { requestActionSummary, requestRef, writeSystemLog } from "@/lib/system-log";
import {
  positions,
  requestActions,
  requestAssignees,
  requestSteps,
  requests,
  routeSteps,
  users,
  type Request,
  type RequestStep,
  type StepAction,
} from "@/lib/db/schema";

export class WorkflowError extends Error {}

export async function startWorkflow(request: Pick<Request, "id" | "submittedBy">) {
  await ensureSchema();

  const template = await db.select().from(routeSteps).orderBy(asc(routeSteps.sortOrder));
  if (!template.some((step) => step.kind === "approve")) {
    throw new WorkflowError("The route must include at least one approve step.");
  }

  const positionRows = await db.select().from(positions);
  const names = new Map(positionRows.map((row) => [row.id, row.name]));

  const created: RequestStep[] = [];
  for (const step of template) {
    const id = crypto.randomUUID();
    const row = {
      id,
      requestId: request.id,
      sortOrder: step.sortOrder,
      kind: step.kind,
      positionId: step.positionId,
      positionName: names.get(step.positionId) ?? "Unknown",
      rule: step.rule,
      state: "pending" as const,
    };
    await db.insert(requestSteps).values(row);
    created.push(row);
  }

  await activateStep(request, created[0]);
}

async function submitterPositionId(submittedBy: string) {
  const [submitter] = await db
    .select({ positionId: users.positionId })
    .from(users)
    .where(eq(users.id, submittedBy))
    .limit(1);
  return submitter?.positionId ?? null;
}

function requesterCutoffOrder(
  steps: Pick<RequestStep, "positionId" | "sortOrder">[],
  requesterPositionId: string | null,
) {
  if (!requesterPositionId) return null;
  const own = steps.filter((step) => step.positionId === requesterPositionId);
  if (own.length === 0) return null;
  return Math.max(...own.map((step) => step.sortOrder));
}

async function shouldSkipStep(
  request: Pick<Request, "submittedBy">,
  step: RequestStep,
  allSteps: RequestStep[],
) {
  const requesterPositionId = await submitterPositionId(request.submittedBy);
  const cutoff = requesterCutoffOrder(allSteps, requesterPositionId);
  if (cutoff != null && step.sortOrder <= cutoff) {
    return true;
  }

  const holders = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.positionId, step.positionId), eq(users.active, true)));
  return holders.every((holder) => holder.id === request.submittedBy);
}

export async function activateStep(
  request: Pick<Request, "id" | "submittedBy">,
  step: RequestStep,
) {
  await db
    .update(requests)
    .set({ currentStepOrder: step.sortOrder })
    .where(eq(requests.id, request.id));

  const allSteps = await db
    .select()
    .from(requestSteps)
    .where(eq(requestSteps.requestId, request.id))
    .orderBy(asc(requestSteps.sortOrder));

  if (await shouldSkipStep(request, step, allSteps)) {
    const next = allSteps.find(
      (row) => row.sortOrder > step.sortOrder && row.state === "pending",
    );

    if (next) {
      await db
        .update(requestSteps)
        .set({ state: "skipped" })
        .where(eq(requestSteps.id, step.id));
      await activateStep(request, next);
      return;
    }
  }

  const holders = await db
    .select()
    .from(users)
    .where(and(eq(users.positionId, step.positionId), eq(users.active, true)));
  const eligible = holders.filter((holder) => holder.id !== request.submittedBy);

  await db
    .update(requestSteps)
    .set({ state: "active" })
    .where(eq(requestSteps.id, step.id));

  for (const holder of eligible) {
    await db.insert(requestAssignees).values({
      id: crypto.randomUUID(),
      requestStepId: step.id,
      userId: holder.id,
      completed: false,
    });
  }

  notifyAssigneesOfTurn({
    requestId: request.id,
    userIds: eligible.map((holder) => holder.id),
    positionName: step.positionName,
    kind: step.kind,
  });
}

export async function repairEmptyActiveSteps() {
  const open = await db
    .select()
    .from(requests)
    .where(eq(requests.status, "pending"));

  for (const request of open) {
    const [step] = await db
      .select()
      .from(requestSteps)
      .where(
        and(eq(requestSteps.requestId, request.id), eq(requestSteps.state, "active")),
      )
      .limit(1);
    if (!step) continue;

    const allSteps = await db
      .select()
      .from(requestSteps)
      .where(eq(requestSteps.requestId, request.id))
      .orderBy(asc(requestSteps.sortOrder));
    const skip = await shouldSkipStep(request, step, allSteps);
    const assignees = await db
      .select({
        id: requestAssignees.id,
        active: users.active,
      })
      .from(requestAssignees)
      .leftJoin(users, eq(requestAssignees.userId, users.id))
      .where(eq(requestAssignees.requestStepId, step.id));
    const liveAssignees = assignees.filter((row) => row.active);
    if (!skip && liveAssignees.length > 0) continue;

    const next = allSteps.find(
      (row) => row.sortOrder > step.sortOrder && row.state === "pending",
    );

    if (!next) continue;

    await db
      .update(requestSteps)
      .set({ state: "skipped" })
      .where(eq(requestSteps.id, step.id));
    await activateStep(request, next);
  }
}

export async function actOnStep(input: {
  requestId: string;
  userId: string;
  action: StepAction;
  comment?: string;
}) {
  await ensureSchema();

  const [request] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, input.requestId))
    .limit(1);

  if (!request || request.status !== "pending") {
    throw new WorkflowError("This request is not waiting for a decision.");
  }

  if (request.submittedBy === input.userId) {
    throw new WorkflowError("You cannot act on your own request.");
  }

  const [actor] = await db
    .select({ active: users.active, name: users.name })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (!actor?.active) {
    throw new WorkflowError("You cannot act on this step.");
  }

  const [step] = await db
    .select()
    .from(requestSteps)
    .where(
      and(eq(requestSteps.requestId, request.id), eq(requestSteps.state, "active")),
    )
    .limit(1);

  if (!step) {
    throw new WorkflowError("This request has no active step.");
  }

  const [assignee] = await db
    .select()
    .from(requestAssignees)
    .where(
      and(
        eq(requestAssignees.requestStepId, step.id),
        eq(requestAssignees.userId, input.userId),
      ),
    )
    .limit(1);

  if (!assignee || assignee.completed) {
    throw new WorkflowError("You cannot act on this step.");
  }

  if (step.kind === "review" && input.action === "rejected") {
    throw new WorkflowError("Reviewers cannot reject a request.");
  }

  if (step.kind === "review" && input.action === "approved") {
    throw new WorkflowError("Use pass to complete a review step.");
  }

  if (step.kind === "approve" && input.action === "passed") {
    throw new WorkflowError("Use approve to complete an approval step.");
  }

  if (
    (input.action === "sent_back" || input.action === "rejected") &&
    !input.comment
  ) {
    throw new WorkflowError("Add a short reason for this action.");
  }

  await db.insert(requestActions).values({
    id: crypto.randomUUID(),
    requestId: request.id,
    requestStepId: step.id,
    userId: input.userId,
    action: input.action,
    comment: input.comment ?? null,
    createdAt: new Date(),
  });
  await writeSystemLog({
    actor: { id: input.userId, name: actor.name },
    action: `request.${input.action}`,
    summary: requestActionSummary(input.action, request.title, input.comment, request.number),
    requestId: request.id,
  });

  if (input.action === "sent_back") {
    await db
      .update(requestAssignees)
      .set({ completed: false })
      .where(eq(requestAssignees.requestStepId, step.id));

    await db
      .update(requests)
      .set({
        status: "changes_requested",
        sendBackReason: input.comment,
      })
      .where(eq(requests.id, request.id));
    notifyRequesterOutcome({
      requestId: request.id,
      outcome: "sent_back",
      actorName: actor.name,
      comment: input.comment,
    });
    return;
  }

  if (input.action === "rejected") {
    await db
      .update(requests)
      .set({
        status: "rejected",
        decidedBy: input.userId,
        decidedAt: new Date(),
        rejectionReason: input.comment,
      })
      .where(eq(requests.id, request.id));
    notifyRequesterOutcome({
      requestId: request.id,
      outcome: "rejected",
      actorName: actor.name,
      comment: input.comment,
    });
    return;
  }

  await db
    .update(requestAssignees)
    .set({ completed: true })
    .where(eq(requestAssignees.id, assignee.id));

  const assignees = await db
    .select()
    .from(requestAssignees)
    .where(eq(requestAssignees.requestStepId, step.id));

  const rule = step.kind === "review" ? "at_least_1" : step.rule;
  const completedCount = assignees.filter((row) => row.completed).length;
  const met =
    assignees.length > 0 &&
    (rule === "at_least_1" ? completedCount >= 1 : completedCount === assignees.length);

  if (met) {
    await completeStep(request, step);
  }
}

async function completeStep(
  request: Pick<Request, "id" | "submittedBy" | "decidedBy">,
  step: RequestStep,
) {
  await db
    .update(requestSteps)
    .set({ state: "passed" })
    .where(eq(requestSteps.id, step.id));

  const allSteps = await db
    .select()
    .from(requestSteps)
    .where(eq(requestSteps.requestId, request.id))
    .orderBy(asc(requestSteps.sortOrder));

  const isLastApprove =
    step.kind === "approve" &&
    !allSteps.some((row) => row.sortOrder > step.sortOrder && row.kind === "approve");

  if (isLastApprove) {
    const approvals = await db
      .select()
      .from(requestActions)
      .where(
        and(
          eq(requestActions.requestStepId, step.id),
          eq(requestActions.action, "approved"),
        ),
      )
      .orderBy(asc(requestActions.createdAt));

    const decidedBy = approvals.at(-1)?.userId ?? request.decidedBy;
    await db
      .update(requests)
      .set({
        status: "approved",
        decidedBy,
        decidedAt: new Date(),
      })
      .where(eq(requests.id, request.id));

    const [decider] = decidedBy
      ? await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, decidedBy))
          .limit(1)
      : [];
    notifyRequesterOutcome({
      requestId: request.id,
      outcome: "approved",
      actorName: decider?.name ?? "Someone",
    });
    return;
  }

  const next = allSteps.find((row) => row.sortOrder > step.sortOrder);
  if (!next) {
    return;
  }

  await activateStep(request, next);
}

const retractableActions = new Set<StepAction>(["passed", "approved", "rejected"]);

function actionIsLater(
  left: { createdAt: Date; id: string },
  right: { createdAt: Date; id: string },
) {
  const leftTime = left.createdAt.getTime();
  const rightTime = right.createdAt.getTime();
  return leftTime > rightTime || (leftTime === rightTime && left.id > right.id);
}

export async function findRetractableAction(requestId: string, userId: string) {
  const [request] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);
  if (
    !request ||
    request.submittedBy === userId ||
    request.status === "withdrawn" ||
    request.status === "changes_requested"
  ) {
    return null;
  }

  const actions = await db
    .select()
    .from(requestActions)
    .where(eq(requestActions.requestId, requestId))
    .orderBy(desc(requestActions.createdAt), desc(requestActions.id));

  const mine = actions.find((row) => row.userId === userId);
  if (!mine || !retractableActions.has(mine.action)) return null;
  if (actions.some((row) => row.id !== mine.id && actionIsLater(row, mine))) {
    return null;
  }

  return { request, stamp: mine };
}

export async function retractDecision(
  requestId: string,
  userId: string,
  comment: string,
) {
  await ensureSchema();

  const reason = comment.trim();
  if (!reason) {
    throw new WorkflowError("Add a short reason for this retract.");
  }

  const [actor] = await db
    .select({ active: users.active, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!actor?.active) {
    throw new WorkflowError("You cannot retract this decision.");
  }

  const found = await findRetractableAction(requestId, userId);
  if (!found) {
    throw new WorkflowError(
      "You can only retract your last pass, approve, or reject, and only if nobody has signed after you.",
    );
  }

  const { request, stamp } = found;

  await db.insert(requestActions).values({
    id: crypto.randomUUID(),
    requestId: request.id,
    requestStepId: stamp.requestStepId,
    userId,
    action: "retracted",
    comment: reason,
    createdAt: new Date(),
  });
  await writeSystemLog({
    actor: { id: userId, name: actor.name },
    action: "request.retracted",
    summary: requestActionSummary("retracted", request.title, reason, request.number),
    requestId: request.id,
  });

  if (stamp.action === "rejected") {
    await db
      .update(requests)
      .set({
        status: "pending",
        decidedBy: null,
        decidedAt: null,
        rejectionReason: null,
      })
      .where(eq(requests.id, request.id));
    return;
  }

  const [step] = await db
    .select()
    .from(requestSteps)
    .where(eq(requestSteps.id, stamp.requestStepId))
    .limit(1);
  if (!step) {
    throw new WorkflowError("That step is no longer on this request.");
  }

  const allSteps = await db
    .select()
    .from(requestSteps)
    .where(eq(requestSteps.requestId, request.id))
    .orderBy(asc(requestSteps.sortOrder));
  const later = allSteps.filter((row) => row.sortOrder > step.sortOrder);
  const laterIds = later.map((row) => row.id);
  if (laterIds.length > 0) {
    await db
      .delete(requestAssignees)
      .where(inArray(requestAssignees.requestStepId, laterIds));
    await db
      .update(requestSteps)
      .set({ state: "pending" })
      .where(inArray(requestSteps.id, laterIds));
  }

  await db
    .update(requestAssignees)
    .set({ completed: false })
    .where(
      and(
        eq(requestAssignees.requestStepId, step.id),
        eq(requestAssignees.userId, userId),
      ),
    );

  await db
    .update(requestSteps)
    .set({ state: "active" })
    .where(eq(requestSteps.id, step.id));

  await db
    .update(requests)
    .set({
      status: "pending",
      currentStepOrder: step.sortOrder,
      decidedBy: null,
      decidedAt: null,
      rejectionReason: null,
    })
    .where(eq(requests.id, request.id));

  const assignees = await db
    .select()
    .from(requestAssignees)
    .where(eq(requestAssignees.requestStepId, step.id));
  const rule = step.kind === "review" ? "at_least_1" : step.rule;
  const completedCount = assignees.filter((row) => row.completed).length;
  const met =
    assignees.length > 0 &&
    (rule === "at_least_1" ? completedCount >= 1 : completedCount === assignees.length);
  if (met) {
    await completeStep(request, { ...step, state: "active" });
  }
}

export async function resumeAfterEdits(requestId: string, userId: string) {
  await ensureSchema();

  const [request] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!request || request.submittedBy !== userId) {
    throw new WorkflowError("You can only update your own request.");
  }
  if (request.status !== "changes_requested") {
    throw new WorkflowError("This request is not waiting for changes.");
  }

  const [step] = await db
    .select()
    .from(requestSteps)
    .where(
      and(eq(requestSteps.requestId, request.id), eq(requestSteps.state, "active")),
    )
    .limit(1);

  if (step) {
    await db
      .update(requestAssignees)
      .set({ completed: false })
      .where(eq(requestAssignees.requestStepId, step.id));

    const waiting = await db
      .select({ userId: requestAssignees.userId })
      .from(requestAssignees)
      .where(eq(requestAssignees.requestStepId, step.id));
    notifyAssigneesOfTurn({
      requestId: request.id,
      userIds: waiting.map((row) => row.userId),
      positionName: step.positionName,
      kind: step.kind,
    });
  }

  await db
    .update(requests)
    .set({ status: "pending", sendBackReason: null })
    .where(eq(requests.id, request.id));
}

export async function withdrawRequest(requestId: string, userId: string) {
  await ensureSchema();

  const [request] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  if (!request || request.submittedBy !== userId) {
    throw new WorkflowError("You can only withdraw your own request.");
  }
  if (request.status !== "pending") {
    throw new WorkflowError("Only a pending request can be withdrawn.");
  }

  const [signedOff] = await db
    .select({ id: requestActions.id })
    .from(requestActions)
    .where(eq(requestActions.requestId, requestId))
    .limit(1);

  if (signedOff) {
    throw new WorkflowError(
      "Someone has already signed off. You can no longer withdraw this request.",
    );
  }

  const updated = await db
    .update(requests)
    .set({
      status: "withdrawn",
      decidedBy: userId,
      decidedAt: new Date(),
    })
    .where(and(eq(requests.id, requestId), eq(requests.status, "pending")))
    .returning({ id: requests.id });

  if (updated.length === 0) {
    throw new WorkflowError("This request is not waiting to be withdrawn.");
  }

  const [after] = await db
    .select({ id: requestActions.id })
    .from(requestActions)
    .where(eq(requestActions.requestId, requestId))
    .limit(1);

  if (after) {
    await db
      .update(requests)
      .set({
        status: "pending",
        decidedBy: null,
        decidedAt: null,
      })
      .where(
        and(
          eq(requests.id, requestId),
          eq(requests.status, "withdrawn"),
          eq(requests.decidedBy, userId),
        ),
      );
    throw new WorkflowError(
      "Someone has already signed off. You can no longer withdraw this request.",
    );
  }

  await writeSystemLog({
    actor: { id: userId, name: request.requesterName },
    action: "request.withdrawn",
    summary: `Withdrew ${requestRef(request.title, request.number)}`,
    requestId: request.id,
  });
}

export function isLastApproveStep(steps: RequestStep[], step: RequestStep) {
  return (
    step.kind === "approve" &&
    !steps.some((row) => row.sortOrder > step.sortOrder && row.kind === "approve")
  );
}
