"use client";

import { useActionState, useEffect, useState } from "react";
import { savePerson, type UserActionState } from "@/app/actions/users";
import { useT } from "@/components/locale-provider";
import type { Department, Position, Role } from "@/lib/db/schema";
import { inputClassCompact } from "@/lib/ui";

const selectClass = `w-full min-w-0 max-w-full ${inputClassCompact}`;

export function PersonAssignment({
  userId,
  role,
  positionId,
  departmentId,
  positions,
  departments,
}: {
  userId: string;
  role: Role;
  positionId: string | null;
  departmentId: string | null;
  positions: Position[];
  departments: Department[];
}) {
  const t = useT();
  const formId = `person-${userId}`;
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    savePerson,
    undefined,
  );
  const [nextRole, setNextRole] = useState(role);
  const [nextPositionId, setNextPositionId] = useState(positionId ?? "");
  const [nextDepartmentId, setNextDepartmentId] = useState(departmentId ?? "");

  useEffect(() => {
    setNextRole(role);
    setNextPositionId(positionId ?? "");
    setNextDepartmentId(departmentId ?? "");
  }, [role, positionId, departmentId]);

  return (
    <>
      <td className="min-w-0 px-3 py-3">
        <select
          form={formId}
          name="role"
          value={nextRole}
          onChange={(event) => setNextRole(event.target.value as Role)}
          className={selectClass}
        >
          <option value="member">{t("people.member")}</option>
          <option value="admin">{t("people.admin")}</option>
        </select>
      </td>
      <td className="min-w-0 px-3 py-3">
        <select
          form={formId}
          name="positionId"
          value={nextPositionId}
          onChange={(event) => setNextPositionId(event.target.value)}
          className={selectClass}
        >
          <option value="">{t("people.none")}</option>
          {positions
            .filter((position) => position.active || position.id === positionId)
            .map((position) => (
              <option key={position.id} value={position.id}>
                {position.active ? position.name : t("people.inactiveOption", { name: position.name })}
              </option>
            ))}
        </select>
      </td>
      <td className="min-w-0 px-3 py-3">
        <select
          form={formId}
          name="departmentId"
          value={nextDepartmentId}
          onChange={(event) => setNextDepartmentId(event.target.value)}
          className={selectClass}
        >
          <option value="">{t("people.none")}</option>
          {departments
            .filter((department) => department.active || department.id === departmentId)
            .map((department) => (
              <option key={department.id} value={department.id}>
                {department.active ? department.name : t("people.inactiveOption", { name: department.name })}
              </option>
            ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <form
          id={formId}
          action={formAction}
          onReset={(event) => event.preventDefault()}
          className="flex flex-col items-start gap-1"
        >
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={pending}
            className="btn-ghost px-2 py-1"
          >
            {pending ? t("people.saving") : t("people.save")}
          </button>
          {state?.error ? (
            <span className="text-xs text-rose-700" role="alert">
              {state.error}
            </span>
          ) : null}
        </form>
      </td>
    </>
  );
}
