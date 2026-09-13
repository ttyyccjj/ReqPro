"use client";

import { useActionState, useState } from "react";
import { signInAction, signUpAction, type AuthFormState } from "@/app/actions/auth";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");

  return (
    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-zinc-900">
        {mode === "signin" ? "Sign in to ReqPro" : "Create a ReqPro account"}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Company request and approval workspace.
      </p>

      <AuthFields key={mode} mode={mode} email={email} onEmailChange={setEmail} />

      <button
        type="button"
        className="mt-4 text-sm text-zinc-600 underline hover:text-zinc-900"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
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
  const [name, setName] = useState("");

  return (
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="mt-6 space-y-4"
    >
      {mode === "signup" ? (
        <label className="block text-sm font-medium text-zinc-700">
          Name
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
      <label className="block text-sm font-medium text-zinc-700">
        Email
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
      <label className="block text-sm font-medium text-zinc-700">
        Password
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
        <p className="text-sm text-rose-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
