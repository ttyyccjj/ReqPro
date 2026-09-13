"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import { requestTypes } from "@/lib/db/schema";
import { zodMessage } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-server";
import { writeSystemLog } from "@/lib/system-log";
import {
  renameRequestTypeSchema,
  requestTypeNameSchema,
  setActiveSchema,
} from "@/lib/validations";

export type RequestTypeActionState = { error?: string } | undefined;

function revalidateTypes() {
  revalidatePath("/settings");
  revalidatePath("/requests/new");
  revalidatePath("/");
}

export async function listRequestTypes() {
  await ensureSchema();
  return db.select().from(requestTypes).orderBy(asc(requestTypes.name));
}

export async function listActiveRequestTypes() {
  await ensureSchema();
  return db
    .select({ id: requestTypes.id, name: requestTypes.name })
    .from(requestTypes)
    .where(eq(requestTypes.active, true))
    .orderBy(asc(requestTypes.name));
}

export async function getActiveRequestTypeName(typeId: string) {
  await ensureSchema();
  const [row] = await db
    .select({ name: requestTypes.name })
    .from(requestTypes)
    .where(and(eq(requestTypes.id, typeId), eq(requestTypes.active, true)))
    .limit(1);
  return row?.name ?? null;
}

export async function addRequestType(
  _prev: RequestTypeActionState,
  formData: FormData,
): Promise<RequestTypeActionState> {
  const admin = await requireAdmin();
  const parsed = requestTypeNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    const t = await getTranslator();
    return { error: zodMessage(t, parsed.error.issues, "validation.checkName") };
  }

  await ensureSchema();
  const [existing] = await db
    .select()
    .from(requestTypes)
    .where(eq(requestTypes.name, parsed.data.name))
    .limit(1);
  if (existing) {
    const t = await getTranslator();
    return { error: t("errors.typeExists") };
  }

  await db.insert(requestTypes).values({
    id: crypto.randomUUID(),
    name: parsed.data.name,
    active: true,
    createdAt: new Date(),
  });
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: "type.created",
    summary: `Created request type ${parsed.data.name}`,
  });

  revalidateTypes();
}

export async function renameRequestType(
  _prev: RequestTypeActionState,
  formData: FormData,
): Promise<RequestTypeActionState> {
  const admin = await requireAdmin();
  const parsed = renameRequestTypeSchema.safeParse({
    typeId: formData.get("typeId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    const t = await getTranslator();
    return { error: zodMessage(t, parsed.error.issues, "validation.checkName") };
  }

  await ensureSchema();
  const [current] = await db
    .select()
    .from(requestTypes)
    .where(eq(requestTypes.id, parsed.data.typeId))
    .limit(1);
  if (!current) {
    const t = await getTranslator();
    return { error: t("errors.typeMissing") };
  }

  const [duplicate] = await db
    .select()
    .from(requestTypes)
    .where(eq(requestTypes.name, parsed.data.name))
    .limit(1);
  if (duplicate && duplicate.id !== parsed.data.typeId) {
    const t = await getTranslator();
    return { error: t("errors.typeExists") };
  }

  if (current.name === parsed.data.name) {
    return;
  }

  await db
    .update(requestTypes)
    .set({ name: parsed.data.name })
    .where(eq(requestTypes.id, parsed.data.typeId));
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: "type.renamed",
    summary: `Renamed request type ${current.name} to ${parsed.data.name}`,
  });

  revalidateTypes();
}

export async function setRequestTypeActive(
  _prev: RequestTypeActionState,
  formData: FormData,
): Promise<RequestTypeActionState> {
  const admin = await requireAdmin();
  const parsed = setActiveSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    const t = await getTranslator();
    return { error: t("errors.typeInvalid") };
  }

  const nextActive = parsed.data.active === "true";
  await ensureSchema();

  const [current] = await db
    .select()
    .from(requestTypes)
    .where(eq(requestTypes.id, parsed.data.id))
    .limit(1);
  if (!current) {
    const t = await getTranslator();
    return { error: t("errors.typeMissing") };
  }

  if (!nextActive) {
    const [{ value: activeCount }] = await db
      .select({ value: count() })
      .from(requestTypes)
      .where(eq(requestTypes.active, true));
    if (activeCount <= 1) {
      const t = await getTranslator();
      return { error: t("errors.keepOneType") };
    }
  }

  if (current.active === nextActive) {
    return;
  }

  await db
    .update(requestTypes)
    .set({ active: nextActive })
    .where(eq(requestTypes.id, parsed.data.id));
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: nextActive ? "type.activated" : "type.deactivated",
    summary: `${nextActive ? "Activated" : "Deactivated"} request type ${current.name}`,
  });

  revalidateTypes();
}
