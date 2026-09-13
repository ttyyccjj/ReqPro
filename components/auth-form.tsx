"use client";

import { useActionState, useState } from "react";
import { signInAction, signUpAction, type AuthFormState } from "@/app/actions/auth";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/components/locale-provider";
import { inputClass } from "@/lib/ui";

export function AuthForm() {
  const t = useT();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");

  return (
    <div className="card-accent card w-full max-w-md p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="md:hidden">
          <BrandLogo href="/signin" onDark={false} />
        </div>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </div>
      <h1 className="text-xl font-semibold text-ink">
        {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
      </h1>
      <p className="page-lead">{t("auth.lead")}</p>

      <AuthFields key={mode} mode={mode} email={email} onEmailChange={setEmail} />

      <button
        type="button"
        className="mt-4 text-sm text-muted underline hover:text-ink"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? t("auth.needAccount") : t("auth.haveAccount")}
      </button>
    </div>
  );
}

function AuthFields({
  mode,
  email,
  onEmailChange,
}: {
  mode: "signin" | "signup";
  email: string;
  onEmailChange: (email: string) => void;
}) {
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    undefined,
  );
  const t = useT();
  const [name, setName] = useState("");

  return (
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="mt-6 space-y-4"
    >
      {mode === "signup" ? (
        <label className="block text-sm font-medium text-ink">
          {t("auth.name")}
          <input
            className={inputClass}
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      ) : null}
      <label className="block text-sm font-medium text-ink">
        {t("auth.email")}
        <input
          className={inputClass}
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </label>
      <label className="block text-sm font-medium text-ink">
        {t("auth.password")}
        <input
          className={inputClass}
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          minLength={mode === "signup" ? 8 : undefined}
          required
        />
      </label>
      {state?.error ? (
        <p className="text-sm text-[#93000a]" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t("auth.wait") : mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
      </button>
    </form>
  );
}
