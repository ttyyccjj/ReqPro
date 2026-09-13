"use server";

import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn, signOut } from "@/auth";
import { getCurrentUser, requireUser } from "@/lib/current-user";
import { db, ensureSchema, getDefaultPositionId } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { writeSystemLog } from "@/lib/system-log";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { zodMessage } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-server";
import { changePasswordSchema, signInSchema, signUpSchema } from "@/lib/validations";

export type AuthFormState = { error?: string } | undefined;

function formText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

async function limitAuth(action: string): Promise<string | undefined> {
  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip");

  if (!rateLimit(clientKey(ip, action))) {
    const t = await getTranslator();
    return t("errors.tooManyAttempts");
  }
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limited = await limitAuth("signin");
  if (limited) return { error: limited };

  const parsed = signInSchema.safeParse({
    email: formText(formData, "email"),
    password: formText(formData, "password"),
  });
  if (!parsed.success) {
    const t = await getTranslator();
    return { error: t("errors.invalidEmailPassword") };
  }

  await ensureSchema();
  const [account] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (account && !account.active) {
    const matches = await bcrypt.compare(parsed.data.password, account.passwordHash);
    if (matches) {
      const t = await getTranslator();
      return { error: t("errors.accountDeactivated") };
    }
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const t = await getTranslator();
      return { error: t("errors.invalidCredentials") };
    }
    throw error;
  }
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limited = await limitAuth("signup");
  if (limited) return { error: limited };

  const parsed = signUpSchema.safeParse({
    name: formText(formData, "name"),
    email: formText(formData, "email"),
    password: formText(formData, "password"),
  });
  if (!parsed.success) {
    const t = await getTranslator();
    return { error: zodMessage(t, parsed.error.issues, "validation.checkForm") };
  }

  await ensureSchema();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  if (existing) {
    const t = await getTranslator();
    return { error: t("errors.emailTaken") };
  }

  const [{ value: userCount }] = await db.select({ value: count() }).from(users);
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const isFirst = userCount === 0;
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: isFirst ? "admin" : "member",
    positionId: isFirst ? await getDefaultPositionId() : null,
    active: true,
    createdAt: new Date(),
  });
  await writeSystemLog({
    actor: { id: userId, name: parsed.data.name },
    action: "account.created",
    summary: "Created an account",
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const t = await getTranslator();
      return { error: t("errors.signInAfterCreate") };
    }
    throw error;
  }
}

export async function signOutAction() {
  const user = await getCurrentUser();
  if (user) {
    await writeSystemLog({
      actor: { id: user.id, name: user.name },
      action: "account.signed_out",
      summary: "Signed out",
    });
  }
  await signOut({ redirectTo: "/signin" });
}

export type ChangePasswordState =
  | { error?: string; success?: string }
  | undefined;

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();
  const limited = await limitAuth(`password:${user.id}`);
  if (limited) return { error: limited };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formText(formData, "currentPassword"),
    password: formText(formData, "password"),
    confirmPassword: formText(formData, "confirmPassword"),
  });
  if (!parsed.success) {
    const t = await getTranslator();
    return { error: zodMessage(t, parsed.error.issues, "validation.checkForm") };
  }

  await ensureSchema();
  const [account] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!account) {
    const t = await getTranslator();
    return { error: t("errors.accountUpdateFailed") };
  }

  const matches = await bcrypt.compare(parsed.data.currentPassword, account.passwordHash);
  if (!matches) {
    const t = await getTranslator();
    return { error: t("errors.currentPasswordWrong") };
  }

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(parsed.data.password, 12) })
    .where(eq(users.id, user.id));

  await writeSystemLog({
    actor: { id: user.id, name: user.name },
    action: "account.password_changed",
    summary: "Changed password",
  });

  const t = await getTranslator();
  return { success: t("errors.passwordUpdated") };
}
