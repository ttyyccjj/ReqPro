import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, ensureSchema } from "@/lib/db";
import { positions, users, type User } from "@/lib/db/schema";

export async function getCurrentUser(): Promise<User | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  await ensureSchema();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user?.active) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("You must be signed in.");
  }
  return user;
}

export async function getPositionName(positionId: string | null) {
  if (!positionId) return null;
  await ensureSchema();
  const [row] = await db
    .select({ name: positions.name })
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);
  return row?.name ?? null;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new Error("You do not have access to this action.");
  }
  return user;
}
