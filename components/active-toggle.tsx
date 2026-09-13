"use client";

import { useActionState } from "react";
import { useT } from "@/components/locale-provider";

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
  const t = useT();
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
        className="btn-ghost px-2 py-1 disabled:cursor-not-allowed"
      >
        {pending ? t("active.saving") : active ? t("active.deactivate") : t("active.reactivate")}
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
  const t = useT();
  return (
    <span className="rounded-sm bg-[#f1f5f9] px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-[#475569] uppercase">
      {t("active.inactive")}
    </span>
  );
}
