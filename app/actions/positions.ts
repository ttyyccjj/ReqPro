"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import { positions, routeSteps, users } from "@/lib/db/schema";
import { writeSystemLog } from "@/lib/system-log";
import {
  positionNameSchema,
  renamePositionSchema,
  setActiveSchema,
} from "@/lib/validations";

export type PositionActionState = { error?: string } | undefined;

export async function listPositions() {
  await ensureSchema();
  const rows = await db.select().from(positions);
  const people = await db
    .select({ positionId: users.positionId, active: users.active })
    .from(users);
  return rows.map((position) => ({
    ...position,
    holderCount: people.filter(
      (person) => person.positionId === position.id && person.active,
    ).length,
  }));
}

export async function addPosition(
  _prev: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
  const admin = await requireAdmin();
  const parsed = positionNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the name and try again." };
  }

  await ensureSchema();
  const [existing] = await db
    .select()
    .from(positions)
    .where(eq(positions.name, parsed.data.name))
    .limit(1);
  if (existing) {
    return { error: "A position with that name already exists." };
  }

  await db.insert(positions).values({
    id: crypto.randomUUID(),
    name: parsed.data.name,
    active: true,
    createdAt: new Date(),
  });
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: "position.created",
    summary: `Created position ${parsed.data.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/people");
}

export async function renamePosition(
  _prev: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
  const admin = await requireAdmin();
  const parsed = renamePositionSchema.safeParse({
    positionId: formData.get("positionId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the name and try again." };
  }

  await ensureSchema();
  const [duplicate] = await db
    .select()
    .from(positions)
    .where(eq(positions.name, parsed.data.name))
    .limit(1);
  if (duplicate && duplicate.id !== parsed.data.positionId) {
    return { error: "A position with that name already exists." };
  }

  const [current] = await db
    .select()
    .from(positions)
    .where(eq(positions.id, parsed.data.positionId))
    .limit(1);
  if (!current) {
    return { error: "That position no longer exists." };
  }
  if (current.name === parsed.data.name) {
    return;
  }

  await db
    .update(positions)
    .set({ name: parsed.data.name })
    .where(eq(positions.id, parsed.data.positionId));
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: "position.renamed",
    summary: `Renamed position ${current.name} to ${parsed.data.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/people");
}

export async function setPositionActive(
  _prev: PositionActionState,
  formData: FormData,
): Promise<PositionActionState> {
  const admin = await requireAdmin();
  const parsed = setActiveSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  });
  if (!parsed.success) {
    return { error: "That position change is not valid." };
  }

  const nextActive = parsed.data.active === "true";
  await ensureSchema();

  const [current] = await db
    .select()
    .from(positions)
    .where(eq(positions.id, parsed.data.id))
    .limit(1);
  if (!current) {
    return { error: "That position no longer exists." };
  }

  if (!nextActive) {
    const [assigned] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.positionId, parsed.data.id))
      .limit(1);
    if (assigned) {
      return { error: "Move people out of this position first." };
    }

    const [onRoute] = await db
      .select({ id: routeSteps.id })
      .from(routeSteps)
      .where(eq(routeSteps.positionId, parsed.data.id))
      .limit(1);
    if (onRoute) {
      return { error: "Remove it from the route first." };
    }
  }

  if (current.active === nextActive) {
    return;
  }

  await db
    .update(positions)
    .set({ active: nextActive })
    .where(eq(positions.id, parsed.data.id));
  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: nextActive ? "position.activated" : "position.deactivated",
    summary: `${nextActive ? "Activated" : "Deactivated"} position ${current.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/people");
}
