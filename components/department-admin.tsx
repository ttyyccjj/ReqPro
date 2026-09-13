"use client";

import { useActionState } from "react";
import {
  addDepartment,
  renameDepartment,
  setDepartmentActive,
  type DepartmentActionState,
} from "@/app/actions/departments";
import { ActiveToggleForm } from "@/components/active-toggle";

import { inputClassCompact as inputClass } from "@/lib/ui";

export function AddDepartmentForm() {
  const [state, formAction, pending] = useActionState<DepartmentActionState, FormData>(
    addDepartment,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        className={inputClass}
        name="name"
        placeholder="Department name"
        required
        maxLength={80}
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-primary py-1.5"
      >
        {pending ? "Adding…" : "Add department"}
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
        {pending ? "Saving…" : "Rename"}
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
