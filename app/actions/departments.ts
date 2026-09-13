"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import { departments, users } from "@/lib/db/schema";
import { writeSystemLog } from "@/lib/system-log";
import {
  departmentNameSchema,
  renameDepartmentSchema,
  setActiveSchema,
} from "@/lib/validations";

export type DepartmentActionState = { error?: string } | undefined;

function revalidateDepartments() {
  revalidatePath("/settings");
  revalidatePath("/requests/new");
  revalidatePath("/");
}

export async function listDepartments() {
  await ensureSchema();
  return db.select().from(departments).orderBy(asc(departments.name));
}

export async function getActiveDepartmentName(departmentId: string) {
  await ensureSchema();
  const [row] = await db
    .select({ name: departments.name })
    .from(departments)
    .where(and(eq(departments.id, departmentId), eq(departments.active, true)))
    .limit(1);
  return row?.name ?? null;
}

export async function addDepartment(
  _prev: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const admin = await requireAdmin();
  const parsed = departmentNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the name and try again." };
  }

  await ensureSchema();
  const [existing] = await db
    .select()
    .from(departments)
    .where(eq(departments.name, parsed.data.name))
    .limit(1);
  if (existing) {
    return { error: "A department with that name already exists." };
  }

  await db.insert(departments).values({
    id: crypto.randomUUID(),
    name: parsed.data.name,
    active: true,
    createdAt: new Date(),
  });
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: "department.created",
    summary: `Created department ${parsed.data.name}`,
  });

  revalidateDepartments();
}

export async function renameDepartment(
  _prev: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const admin = await requireAdmin();
  const parsed = renameDepartmentSchema.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the name and try again." };
  }

  await ensureSchema();
  const [current] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, parsed.data.departmentId))
    .limit(1);
  if (!current) {
    return { error: "That department no longer exists." };
  }

  const [duplicate] = await db
    .select()
    .from(departments)
    .where(eq(departments.name, parsed.data.name))
    .limit(1);
  if (duplicate && duplicate.id !== parsed.data.departmentId) {
    return { error: "A department with that name already exists." };
  }

  if (current.name === parsed.data.name) {
    return;
  }

  await db
    .update(departments)
    .set({ name: parsed.data.name })
    .where(eq(departments.id, parsed.data.departmentId));
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: "department.renamed",
    summary: `Renamed department ${current.name} to ${parsed.data.name}`,
  });

  revalidateDepartments();
}

export async function setDepartmentActive(
  _prev: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const admin = await requireAdmin();
  const parsed = setActiveSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { error: "That department change is not valid." };
  }

  const nextActive = parsed.data.active === "true";
  await ensureSchema();

  const [current] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, parsed.data.id))
    .limit(1);
  if (!current) {
    return { error: "That department no longer exists." };
  }

  if (!nextActive) {
    const [assigned] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.departmentId, parsed.data.id))
      .limit(1);
    if (assigned) {
      return { error: "Move people out of this department first." };
    }
  }

  if (current.active === nextActive) {
    return;
  }

  await db
    .update(departments)
    .set({ active: nextActive })
    .where(eq(departments.id, parsed.data.id));
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: nextActive ? "department.activated" : "department.deactivated",
    summary: `${nextActive ? "Activated" : "Deactivated"} department ${current.name}`,
  });

  revalidateDepartments();
  revalidatePath("/people");
}
