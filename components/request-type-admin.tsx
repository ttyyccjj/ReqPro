"use client";

import { useActionState } from "react";
import {
  addRequestType,
  renameRequestType,
  setRequestTypeActive,
  type RequestTypeActionState,
} from "@/app/actions/request-types";
import { ActiveToggleForm } from "@/components/active-toggle";

const inputClass = "rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm";

export function AddRequestTypeForm() {
  const [state, formAction, pending] = useActionState<RequestTypeActionState, FormData>(
    addRequestType,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        className={inputClass}
        name="name"
        placeholder="Type name"
        required
        maxLength={80}
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add type"}
      </button>
      {state?.error ? (
        <span className="text-sm text-rose-700" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function RenameRequestTypeForm({
  typeId,
  name,
}: {
  typeId: string;
  name: string;
}) {
  const [state, formAction, pending] = useActionState<RequestTypeActionState, FormData>(
    renameRequestType,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="typeId" value={typeId} />
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

export function RequestTypeActiveToggle({
  typeId,
  active,
}: {
  typeId: string;
  active: boolean;
}) {
  return <ActiveToggleForm action={setRequestTypeActive} id={typeId} active={active} />;
}
