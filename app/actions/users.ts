"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import { departments, positions, users } from "@/lib/db/schema";
import { getTranslator } from "@/lib/i18n-server";
import { writeSystemLog } from "@/lib/system-log";
import { setActiveSchema, setPersonSchema } from "@/lib/validations";
import { repairEmptyActiveSteps } from "@/lib/workflow";

export type UserActionState = { error?: string } | undefined;

export async function listUsers() {
  await requireAdmin();
  await ensureSchema();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      positionId: users.positionId,
      positionName: positions.name,
      departmentId: users.departmentId,
      departmentName: departments.name,
      active: users.active,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(positions, eq(users.positionId, positions.id))
    .leftJoin(departments, eq(users.departmentId, departments.id));
}

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function savePerson(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  const parsed = setPersonSchema.safeParse({
    userId: formText(formData, "userId"),
    role: formText(formData, "role"),
    positionId: formText(formData, "positionId") || null,
    departmentId: formText(formData, "departmentId") || null,
  });

  if (!parsed.success) {
    const t = await getTranslator();
    return { error: t("errors.assignmentInvalid") };
  }

  await ensureSchema();

  if (parsed.data.role === "member") {
    const [otherAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, "admin"),
          eq(users.active, true),
          ne(users.id, parsed.data.userId),
        ),
      )
      .limit(1);

    if (!otherAdmin) {
      const t = await getTranslator();
      return { error: t("errors.keepOneAdmin") };
    }
  }

  if (parsed.data.positionId) {
    const [position] = await db
      .select({ active: positions.active })
      .from(positions)
      .where(eq(positions.id, parsed.data.positionId))
      .limit(1);
    if (!position?.active) {
      const t = await getTranslator();
      return { error: t("errors.positionUnavailable") };
    }
  }

  if (parsed.data.departmentId) {
    const [department] = await db
      .select({ active: departments.active })
      .from(departments)
      .where(eq(departments.id, parsed.data.departmentId))
      .limit(1);
    if (!department?.active) {
      const t = await getTranslator();
      return { error: t("errors.departmentUnavailable") };
    }
  }

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) {
    const t = await getTranslator();
    return { error: t("errors.accountMissing") };
  }

  const [nextPosition] = parsed.data.positionId
    ? await db
        .select({ name: positions.name })
        .from(positions)
        .where(eq(positions.id, parsed.data.positionId))
        .limit(1)
    : [];
  const [nextDepartment] = parsed.data.departmentId
    ? await db
        .select({ name: departments.name })
        .from(departments)
        .where(eq(departments.id, parsed.data.departmentId))
        .limit(1)
    : [];

  await db
    .update(users)
    .set({
      role: parsed.data.role,
      positionId: parsed.data.positionId,
      departmentId: parsed.data.departmentId,
    })
    .where(eq(users.id, parsed.data.userId));

  const changes: string[] = [];
  if (target.role !== parsed.data.role) {
    changes.push(`role to ${parsed.data.role}`);
  }
  if (target.positionId !== parsed.data.positionId) {
    changes.push(`position to ${nextPosition?.name ?? "none"}`);
  }
  if (target.departmentId !== parsed.data.departmentId) {
    changes.push(`department to ${nextDepartment?.name ?? "none"}`);
  }
  if (changes.length > 0) {
    await writeSystemLog({
      actor: { id: admin.id, name: admin.name },
      action: "person.updated",
      summary: `Updated ${target.name}: ${changes.join(", ")}`,
    });
  }

  revalidatePath("/people");
  revalidatePath("/settings");
  revalidatePath("/requests/new");
}

export async function setUserActive(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  const parsed = setActiveSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    const t = await getTranslator();
    return { error: t("errors.accountChangeInvalid") };
  }

  const nextActive = parsed.data.active === "true";
  if (!nextActive && parsed.data.id === admin.id) {
    const t = await getTranslator();
    return { error: t("errors.cannotDeactivateSelf") };
  }

  await ensureSchema();
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, parsed.data.id))
    .limit(1);
  if (!target) {
    const t = await getTranslator();
    return { error: t("errors.accountMissing") };
  }

  if (!nextActive && target.role === "admin") {
    const [otherAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, "admin"),
          eq(users.active, true),
          ne(users.id, parsed.data.id),
        ),
      )
      .limit(1);
    if (!otherAdmin) {
      const t = await getTranslator();
      return { error: t("errors.keepOneAdmin") };
    }
  }

  if (target.active === nextActive) {
    return;
  }

  await db
    .update(users)
    .set({ active: nextActive })
    .where(eq(users.id, parsed.data.id));

  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: nextActive ? "person.activated" : "person.deactivated",
    summary: `${nextActive ? "Activated" : "Deactivated"} ${target.name}`,
  });

  if (!nextActive) {
    await repairEmptyActiveSteps();
  }

  revalidatePath("/people");
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/approvals");
}
