"use client";

import { useActionState } from "react";
import {
  addPosition,
  renamePosition,
  setPositionActive,
  type PositionActionState,
} from "@/app/actions/positions";
import { ActiveToggleForm } from "@/components/active-toggle";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm";

export function AddPositionForm() {
  const [state, formAction, pending] = useActionState<PositionActionState, FormData>(
    addPosition,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input className={inputClass} name="name" placeholder="Position name" required maxLength={80} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add position"}
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
        className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Rename"}
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
