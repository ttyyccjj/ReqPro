"use client";

import { useActionState } from "react";
import {
  addDepartment,
  renameDepartment,
  setDepartmentActive,
  type DepartmentActionState,
} from "@/app/actions/departments";
import { ActiveToggleForm } from "@/components/active-toggle";
import { useT } from "@/components/locale-provider";

import { inputClassCompact as inputClass } from "@/lib/ui";

export function AddDepartmentForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState<DepartmentActionState, FormData>(
    addDepartment,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        className={inputClass}
        name="name"
        placeholder={t("settings.departmentName")}
        required
        maxLength={80}
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-primary py-1.5"
      >
        {pending ? t("settings.adding") : t("settings.addDepartment")}
      </button>
      {state?.error ? (
        <span className="text-sm text-rose-700" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}

export function RenameDepartmentForm({
  departmentId,
  name,
}: {
  departmentId: string;
  name: string;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<DepartmentActionState, FormData>(
    renameDepartment,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="departmentId" value={departmentId} />
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

export function DepartmentActiveToggle({
  departmentId,
  active,
}: {
  departmentId: string;
  active: boolean;
}) {
  return <ActiveToggleForm action={setDepartmentActive} id={departmentId} active={active} />;
}
