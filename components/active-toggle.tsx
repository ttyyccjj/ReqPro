"use client";

import { useActionState } from "react";

type ActionState = { error?: string } | undefined;

export function ActiveToggleForm({
  action,
  id,
  active,
  disabled,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  id: string;
  active: boolean;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : active ? "Deactivate" : "Reactivate"}
      </button>
      {state?.error ? (
        <span className="text-xs text-rose-700" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function InactiveBadge() {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
      Inactive
    </span>
  );
}
