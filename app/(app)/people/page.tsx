import { redirect } from "next/navigation";
import { listDepartments } from "@/app/actions/departments";
import { listPositions } from "@/app/actions/positions";
import { listUsers, setUserActive } from "@/app/actions/users";
import { ActiveToggleForm, InactiveBadge } from "@/components/active-toggle";
import { PersonAssignment } from "@/components/person-form";
import { getCurrentUser } from "@/lib/current-user";
import { LocalDate } from "@/components/local-date";

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const [people, positions, departmentRows] = await Promise.all([
    listUsers(),
    listPositions(),
    listDepartments(),
  ]);

  return (
    <section>
      <h1 className="page-title">People</h1>
      <p className="page-lead">
        App access is admin or member. Position decides who acts on a route
        step. Department is the requester&apos;s team on a request. Deactivate
        an account instead of deleting it so history stays intact.
      </p>

      <div className="card mt-6 overflow-x-auto">
        <table className="data-table table-fixed">
          <thead>
            <tr>
              <th className="w-[28%]">Person</th>
              <th className="w-[12%]">Role</th>
              <th className="w-[20%]">Position</th>
              <th className="w-[18%]">Department</th>
              <th className="w-[8%]">
                <span className="sr-only">Save assignment</span>
              </th>
              <th className="w-[14%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id} className={person.active ? "" : "opacity-70"}>
                <td>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      {person.name}
                      {person.active ? null : <InactiveBadge />}
                    </p>
                    <p className="truncate text-muted" title={person.email}>
                      {person.email}
                    </p>
                    <p className="font-mono text-xs text-muted">
                      <LocalDate value={person.createdAt} />
                    </p>
                  </div>
                </td>
                <PersonAssignment
                  userId={person.id}
                  role={person.role}
                  positionId={person.positionId}
                  departmentId={person.departmentId}
                  positions={positions}
                  departments={departmentRows}
                />
                <td>
                  <ActiveToggleForm
                    action={setUserActive}
                    id={person.id}
                    active={person.active}
                    disabled={person.id === user.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
