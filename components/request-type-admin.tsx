"use client";

import { useActionState } from "react";
import {
  addRequestType,
  renameRequestType,
  setRequestTypeActive,
  type RequestTypeActionState,
} from "@/app/actions/request-types";
import { ActiveToggleForm } from "@/components/active-toggle";
import { useT } from "@/components/locale-provider";
import { inputClassCompact as inputClass } from "@/lib/ui";

export function AddRequestTypeForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<RequestTypeActionState, FormData>(
    addRequestType,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        className={inputClass}
        name="name"
        placeholder={t("settings.typeName")}
        required
        maxLength={80}
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-primary py-1.5"
      >
        {pending ? t("settings.adding") : t("settings.addType")}
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
  const t = useT();
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

export function RequestTypeActiveToggle({
  typeId,
  active,
}: {
  typeId: string;
  active: boolean;
}) {
  return <ActiveToggleForm action={setRequestTypeActive} id={typeId} active={active} />;
}
