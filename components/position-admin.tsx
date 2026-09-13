"use client";

import { useActionState } from "react";
import {
  addPosition,
  renamePosition,
  setPositionActive,
  type PositionActionState,
} from "@/app/actions/positions";
import { ActiveToggleForm } from "@/components/active-toggle";
import { useT } from "@/components/locale-provider";
import { inputClassCompact as inputClass } from "@/lib/ui";

export function AddPositionForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<PositionActionState, FormData>(
    addPosition,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input className={inputClass} name="name" placeholder={t("settings.positionName")} required maxLength={80} />
      <button
        type="submit"
        disabled={pending}
        className="btn-primary py-1.5"
      >
        {pending ? t("settings.adding") : t("settings.addPosition")}
      </button>
      {state?.error ? (
        <span className="text-sm text-rose-700" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function RenamePositionForm({
  positionId,
  name,
}: {
  positionId: string;
  name: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<PositionActionState, FormData>(
    renamePosition,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="positionId" value={positionId} />
      <input className={inputClass} name="name" defaultValue={name} required maxLength={80} />
      <button
        type="submit"
        disabled={pending}
        className="btn-ghost px-2 py-1"
      >
        {pending ? t("settings.saving") : t("settings.rename")}
      </button>
      {state?.error ? (
        <span className="text-xs text-rose-700">{state.error}</span>
      ) : null}
    </form>
  );
}

export function PositionActiveToggle({
  positionId,
  active,
}: {
  positionId: string;
  active: boolean;
}) {
  return <ActiveToggleForm action={setPositionActive} id={positionId} active={active} />;
}
