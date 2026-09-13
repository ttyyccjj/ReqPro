import { redirect } from "next/navigation";
import { listDepartments } from "@/app/actions/departments";
import { listRequestTypes } from "@/app/actions/request-types";
import { listRouteSteps } from "@/app/actions/form-route";
import { listPositions } from "@/app/actions/positions";
import { InactiveBadge } from "@/components/active-toggle";
import {
  AddDepartmentForm,
  DepartmentActiveToggle,
  RenameDepartmentForm,
} from "@/components/department-admin";
import {
  AddRequestTypeForm,
  RenameRequestTypeForm,
  RequestTypeActiveToggle,
} from "@/components/request-type-admin";
import {
  AddPositionForm,
  PositionActiveToggle,
  RenamePositionForm,
} from "@/components/position-admin";
import { RouteStepsEditor } from "@/components/route-step-form";
import { getCurrentUser } from "@/lib/current-user";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const [positions, steps, departmentRows, typeRows] = await Promise.all([
    listPositions(),
    listRouteSteps(),
    listDepartments(),
    listRequestTypes(),
  ]);

  return (
    <section className="space-y-8">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-lead">
          Request types, departments, positions, and the approval steps that
          new requests follow. The last approve step is the final decision. A
          requester skips every step at or below their own position.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="section-title">Request types</h2>
          <p className="page-lead">
            Group requests as Purchase, Travel, and so on. The same form is
            used for every type. Rename changes the live label only. Old
            requests keep the type they were submitted with.
          </p>
        </div>
        {typeRows.length === 0 ? (
          <p className="page-lead">Add a type so people can submit requests.</p>
        ) : (
          <ul className="space-y-2">
            {typeRows.map((type) => (
              <li
                key={type.id}
                className={`card flex flex-wrap items-center justify-between gap-3 p-3 ${
                  type.active ? "" : "bg-wash"
                }`}
              >
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {type.name}
                  {type.active ? null : <InactiveBadge />}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <RenameRequestTypeForm typeId={type.id} name={type.name} />
                  <RequestTypeActiveToggle typeId={type.id} active={type.active} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AddRequestTypeForm />
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="section-title">Departments</h2>
          <p className="page-lead">
            Create the department names here, then assign people on the People
            page. A request uses the requester&apos;s department. Rename
            changes the live label only. Old requests keep the name they were
            submitted with.
          </p>
        </div>
        {departmentRows.length === 0 ? (
          <p className="page-lead">Add a department so people can submit requests.</p>
        ) : (
          <ul className="space-y-2">
            {departmentRows.map((department) => (
              <li
                key={department.id}
                className={`card flex flex-wrap items-center justify-between gap-3 p-3 ${
                  department.active ? "" : "bg-wash"
                }`}
              >
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {department.name}
                  {department.active ? null : <InactiveBadge />}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <RenameDepartmentForm departmentId={department.id} name={department.name} />
                  <DepartmentActiveToggle
                    departmentId={department.id}
                    active={department.active}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AddDepartmentForm />
      </div>

      <div className="space-y-3">
        <h2 className="section-title">Positions</h2>
        <ul className="space-y-2">
          {positions.map((position) => (
            <li
              key={position.id}
              className={`card flex flex-wrap items-center justify-between gap-3 p-3 ${
                position.active ? "" : "bg-wash"
              }`}
            >
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                  {position.name}
                  {position.active ? null : <InactiveBadge />}
                </p>
                <p className="text-xs text-muted">
                  {position.holderCount === 0
                    ? "No one assigned"
                    : `${position.holderCount} assigned`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RenamePositionForm positionId={position.id} name={position.name} />
                <PositionActiveToggle positionId={position.id} active={position.active} />
              </div>
            </li>
          ))}
        </ul>
        <AddPositionForm />
      </div>

      <RouteStepsEditor positions={positions} initialSteps={steps} />
    </section>
  );
}
