"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { db, ensureSchema } from "@/lib/db";
import { positions, routeSteps } from "@/lib/db/schema";
import { writeSystemLog } from "@/lib/system-log";
import { saveRouteStepsSchema } from "@/lib/validations";

export type RouteActionState = { error?: string } | undefined;

export async function listRouteSteps() {
  await ensureSchema();
  return db.select().from(routeSteps).orderBy(asc(routeSteps.sortOrder));
}

export async function saveRouteSteps(
  input: unknown,
): Promise<RouteActionState> {
  const admin = await requireAdmin();
  const parsed = saveRouteStepsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That route is not valid." };
  }

  await ensureSchema();
  const positionRows = await db
    .select({ id: positions.id, active: positions.active })
    .from(positions);
  const knownPositions = new Set(
    positionRows.filter((row) => row.active).map((row) => row.id),
  );
  if (parsed.data.steps.some((step) => !knownPositions.has(step.positionId))) {
    return { error: "That position is not valid." };
  }

  const existing = await db.select({ id: routeSteps.id }).from(routeSteps);
  for (const row of existing) {
    await db.delete(routeSteps).where(eq(routeSteps.id, row.id));
  }

  for (const [index, step] of parsed.data.steps.entries()) {
    await db.insert(routeSteps).values({
      id: crypto.randomUUID(),
      sortOrder: index,
      kind: step.kind,
      positionId: step.positionId,
      rule: step.kind === "review" ? "at_least_1" : step.rule,
    });
  }

  await writeSystemLog({
    actor: { id: admin.id, name: admin.name },
    action: "route.updated",
    summary: `Saved the approval route (${parsed.data.steps.length} ${
      parsed.data.steps.length === 1 ? "step" : "steps"
    })`,
  });

  revalidatePath("/settings");
}
