"use client";

import { useActionState } from "react";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "@/app/actions/auth";

import { useT } from "@/components/locale-provider";
import { inputClass } from "@/lib/ui";

export function PasswordForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium text-ink">
        {t("account.current")}
        <input
          className={inputClass}
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        {t("account.next")}
        <input
          className={inputClass}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        {t("account.confirm")}
        <input
          className={inputClass}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-rose-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
      >
        {pending ? t("account.saving") : t("account.update")}
      </button>
    </form>
  );
}
