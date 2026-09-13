"use server";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AttachmentError,
  assertAttachmentLimits,
  deleteStoredFiles,
  filesFromFormData,
  removeIdsFromFormData,
  saveAttachmentFiles,
} from "@/lib/attachments";
import { requireAdmin, requireUser } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import {
  requestActions,
  requestAssignees,
  requestAttachments,
  requestSteps,
  requests,
  users,
} from "@/lib/db/schema";
import { getActiveDepartmentName } from "@/app/actions/departments";
import { getActiveRequestTypeName } from "@/app/actions/request-types";
import { countInboxFor, inboxWaitingOn } from "@/lib/inbox-count";
import { notifyInbox } from "@/lib/inbox-hub";
import { nextRequestNumber } from "@/lib/request-number";
import { requestRef, writeSystemLog } from "@/lib/system-log";
import { retractSchema, requestSchema, stepActionSchema } from "@/lib/validations";
import {
  WorkflowError,
  actOnStep,
  findRetractableAction,
  repairEmptyActiveSteps,
  resumeAfterEdits,
  retractDecision,
  startWorkflow,
  withdrawRequest as withdrawOpenRequest,
} from "@/lib/workflow";

export type ActionState = { error?: string } | undefined;

function revalidateRequest(id: string) {
  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/requests");
  revalidatePath(`/requests/${id}`);
}

export async function createRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    details: formData.get("details"),
    amount: formData.get("amount") ?? "",
    currency: formData.get("currency") || "PHP",
    typeId: formData.get("typeId") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (!user.departmentId) {
    return { error: "Ask an admin to assign your department before you submit." };
  }

  const department = await getActiveDepartmentName(user.departmentId);
  if (!department) {
    return { error: "Ask an admin to assign your department before you submit." };
  }

  const typeName = await getActiveRequestTypeName(parsed.data.typeId);
  if (!typeName) {
    return { error: "Choose an active request type." };
  }

  const incoming = filesFromFormData(formData);
  try {
    assertAttachmentLimits(incoming, 0);
  } catch (error) {
    if (error instanceof AttachmentError) {
      return { error: error.message };
    }
    throw error;
  }

  await ensureSchema();
  const id = crypto.randomUUID();
  const createdAt = new Date();
  const number = await nextRequestNumber(createdAt);
  const created = {
    id,
    number,
    title: parsed.data.title,
    requesterName: user.name,
    department,
    type: typeName,
    details: parsed.data.details,
    amount: parsed.data.amount,
    currency: parsed.data.amount == null ? null : (parsed.data.currency ?? "PHP"),
    status: "pending" as const,
    submittedBy: user.id,
    createdAt,
  };

  let saved: Awaited<ReturnType<typeof saveAttachmentFiles>> = [];
  try {
    saved = await saveAttachmentFiles(incoming);
    await db.insert(requests).values(created);
    if (saved.length > 0) {
      await db.insert(requestAttachments).values(
        saved.map((file) => ({
          ...file,
          requestId: id,
          createdAt: new Date(),
        })),
      );
    }
    await startWorkflow(created);
    await writeSystemLog({
      actor: { id: user.id, name: user.name },
      action: "request.submitted",
      summary: `Submitted ${requestRef(parsed.data.title, number)}`,
      requestId: id,
    });
  } catch (error) {
    await deleteStoredFiles(saved.map((file) => file.storedName));
    await db.delete(requestAttachments).where(eq(requestAttachments.requestId, id));
    await db.delete(requests).where(eq(requests.id, id));
    if (error instanceof AttachmentError || error instanceof WorkflowError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidateRequest(id);
  notifyInbox();
  redirect(`/requests/${id}`);
}

export async function updateRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  const parsed = requestSchema.safeParse({
    title: formData.get("title"),
    details: formData.get("details"),
    amount: formData.get("amount") ?? "",
    currency: formData.get("currency") || "PHP",
    typeId: formData.get("typeId") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  if (!user.departmentId) {
    return { error: "Ask an admin to assign your department before you resubmit." };
  }

  const department = await getActiveDepartmentName(user.departmentId);
  if (!department) {
    return { error: "Ask an admin to assign your department before you resubmit." };
  }

  const typeName = await getActiveRequestTypeName(parsed.data.typeId);
  if (!typeName) {
    return { error: "Choose an active request type." };
  }

  await ensureSchema();

  const incoming = filesFromFormData(formData);
  const removeIds = removeIdsFromFormData(formData);
  const existing = await db
    .select()
    .from(requestAttachments)
    .where(eq(requestAttachments.requestId, requestId));
  const existingIds = new Set(existing.map((file) => file.id));
  if (removeIds.some((id) => !existingIds.has(id))) {
    return { error: "Those attachments could not be updated." };
  }

  const remaining = existing.filter((file) => !removeIds.includes(file.id));
  try {
    assertAttachmentLimits(incoming, remaining.length);
  } catch (error) {
    if (error instanceof AttachmentError) {
      return { error: error.message };
    }
    throw error;
  }

  let saved: Awaited<ReturnType<typeof saveAttachmentFiles>> = [];
  try {
    saved = await saveAttachmentFiles(incoming);
    await resumeAfterEdits(requestId, user.id);
  } catch (error) {
    await deleteStoredFiles(saved.map((file) => file.storedName));
    if (error instanceof AttachmentError || error instanceof WorkflowError) {
      return { error: error.message };
    }
    throw error;
  }

  await db
    .update(requests)
    .set({
      title: parsed.data.title,
      department,
      type: typeName,
      details: parsed.data.details,
      amount: parsed.data.amount ?? null,
      currency: parsed.data.amount == null ? null : (parsed.data.currency ?? "PHP"),
    })
    .where(eq(requests.id, requestId));

  if (saved.length > 0) {
    await db.insert(requestAttachments).values(
      saved.map((file) => ({
        ...file,
        requestId,
        createdAt: new Date(),
      })),
    );
  }

  if (removeIds.length > 0) {
    const removed = existing.filter((file) => removeIds.includes(file.id));
    await db
      .delete(requestAttachments)
      .where(inArray(requestAttachments.id, removeIds));
    await deleteStoredFiles(removed.map((file) => file.storedName));
  }

  const [current] = await db
    .select({ number: requests.number })
    .from(requests)
    .where(eq(requests.id, requestId))
    .limit(1);

  await writeSystemLog({
    actor: { id: user.id, name: user.name },
    action: "request.resubmitted",
    summary: `Resubmitted ${requestRef(parsed.data.title, current?.number)}`,
    requestId,
  });

  revalidateRequest(requestId);
  notifyInbox();
}

async function withWaitingOn(items: (typeof requests.$inferSelect)[]) {
  const waiting: Record<string, string> = {};
  for (const item of items) {
    const [step] = await db
      .select()
      .from(requestSteps)
      .where(and(eq(requestSteps.requestId, item.id), eq(requestSteps.state, "active")))
      .limit(1);
    if (step) {
      waiting[item.id] = step.positionName;
    }
  }

  return items.map((item) => ({
    ...item,
    waitingOn: waiting[item.id] ?? null,
  }));
}

export async function listMine() {
  const user = await requireUser();
  await ensureSchema();
  await repairEmptyActiveSteps();

  const items = await db
    .select()
    .from(requests)
    .where(eq(requests.submittedBy, user.id))
    .orderBy(desc(requests.createdAt));

  return withWaitingOn(items);
}

export async function listAll() {
  await requireAdmin();
  await ensureSchema();
  await repairEmptyActiveSteps();

  const items = await db.select().from(requests).orderBy(desc(requests.createdAt));
  return withWaitingOn(items);
}

export async function countInbox() {
  const user = await requireUser();
  await ensureSchema();
  await repairEmptyActiveSteps();
  return countInboxFor(user.id);
}

export async function listInbox() {
  const user = await requireUser();
  await ensureSchema();
  await repairEmptyActiveSteps();

  const rows = await db
    .select({
      request: requests,
      step: requestSteps,
      assignee: requestAssignees,
    })
    .from(requestAssignees)
    .innerJoin(requestSteps, eq(requestAssignees.requestStepId, requestSteps.id))
    .innerJoin(requests, eq(requestSteps.requestId, requests.id))
    .where(inboxWaitingOn(user.id))
    .orderBy(desc(requests.createdAt));

  return rows.map((row) => ({
    ...row.request,
    waitingOn: row.step.positionName,
    stepKind: row.step.kind,
  }));
}

export async function listInboxHistory() {
  const user = await requireUser();
  await ensureSchema();

  const rows = await db
    .select({
      request: requests,
      action: requestActions.action,
      actedAt: requestActions.createdAt,
      actionId: requestActions.id,
    })
    .from(requestActions)
    .innerJoin(requests, eq(requestActions.requestId, requests.id))
    .where(eq(requestActions.userId, user.id))
    .orderBy(desc(requestActions.createdAt), desc(requestActions.id));

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.request.id)) {
      latest.set(row.request.id, row);
    }
  }

  return [...latest.values()].map((row) => ({
    ...row.request,
    yourAction: row.action,
    actedAt: row.actedAt,
  }));
}

export async function getRequest(id: string) {
  const user = await requireUser();
  await ensureSchema();
  await repairEmptyActiveSteps();

  const [request] = await db
    .select()
    .from(requests)
    .where(eq(requests.id, id))
    .limit(1);

  if (!request) return null;

  const steps = await db
    .select()
    .from(requestSteps)
    .where(eq(requestSteps.requestId, id))
    .orderBy(asc(requestSteps.sortOrder));

  const stepIds = steps.map((step) => step.id);
  const assignees =
    stepIds.length === 0
      ? []
      : await db.select().from(requestAssignees);
  const stepAssignees = assignees.filter((row) => stepIds.includes(row.requestStepId));

  const isAssignee = stepAssignees.some((row) => row.userId === user.id);
  if (user.role !== "admin" && request.submittedBy !== user.id && !isAssignee) {
    return null;
  }

  const people = await db
    .select({ id: users.id, name: users.name })
    .from(users);
  const names = new Map(people.map((row) => [row.id, row.name]));

  const attachments = await db
    .select({
      id: requestAttachments.id,
      originalName: requestAttachments.originalName,
      mimeType: requestAttachments.mimeType,
      sizeBytes: requestAttachments.sizeBytes,
    })
    .from(requestAttachments)
    .where(eq(requestAttachments.requestId, id))
    .orderBy(asc(requestAttachments.createdAt));

  const actions = await db
    .select()
    .from(requestActions)
    .where(eq(requestActions.requestId, id))
    .orderBy(asc(requestActions.createdAt));

  const active = steps.find((step) => step.state === "active") ?? null;
  const myAssignee = active
    ? stepAssignees.find(
        (row) => row.requestStepId === active.id && row.userId === user.id && !row.completed,
      )
    : null;
  const retractable = await findRetractableAction(id, user.id);

  return {
    ...request,
    steps: steps.map((step) => ({
      ...step,
      isFinalApprove:
        step.kind === "approve" &&
        !steps.some((row) => row.sortOrder > step.sortOrder && row.kind === "approve"),
      assignees: stepAssignees
        .filter((row) => row.requestStepId === step.id)
        .map((row) => ({
          ...row,
          name: names.get(row.userId) ?? "Unknown",
        })),
    })),
    actions: actions.map((action) => ({
      ...action,
      userName: names.get(action.userId) ?? "Unknown",
    })),
    attachments,
    canAct: Boolean(myAssignee) && request.status === "pending" && request.submittedBy !== user.id,
    canRetract: Boolean(retractable),
    retracting: retractable?.stamp.action ?? null,
    canWithdraw:
      request.submittedBy === user.id &&
      request.status === "pending" &&
      actions.length === 0,
    isRequester: request.submittedBy === user.id,
    activeStep: active,
  };
}

export async function withdrawRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) {
    return { error: "That request could not be withdrawn." };
  }

  try {
    await withdrawOpenRequest(requestId, user.id);
  } catch (error) {
    if (error instanceof WorkflowError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidateRequest(requestId);
  notifyInbox();
}

export async function decideRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = stepActionSchema.safeParse({
    requestId: formData.get("requestId"),
    action: formData.get("action"),
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) {
    return { error: "That action is not valid." };
  }

  try {
    await actOnStep({
      requestId: parsed.data.requestId,
      userId: user.id,
      action: parsed.data.action,
      comment: parsed.data.comment,
    });
  } catch (error) {
    if (error instanceof WorkflowError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidateRequest(parsed.data.requestId);
  notifyInbox();
}

export async function retractRequest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = retractSchema.safeParse({
    requestId: formData.get("requestId"),
    comment: formData.get("comment") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Add a short reason for this retract." };
  }

  try {
    await retractDecision(parsed.data.requestId, user.id, parsed.data.comment);
  } catch (error) {
    if (error instanceof WorkflowError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidateRequest(parsed.data.requestId);
  notifyInbox();
}
