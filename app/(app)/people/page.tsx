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
      <h1 className="text-2xl font-semibold text-zinc-900">People</h1>
      <p className="mt-1 text-sm text-zinc-500">
        App access is admin or member. Position decides who acts on a route
        step. Department is the requester&apos;s team on a request. Deactivate
        an account instead of deleting it so history stays intact.
      </p>

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="w-[28%] px-3 py-3 font-medium">Person</th>
              <th className="w-[12%] px-3 py-3 font-medium">Role</th>
              <th className="w-[20%] px-3 py-3 font-medium">Position</th>
              <th className="w-[18%] px-3 py-3 font-medium">Department</th>
              <th className="w-[8%] px-3 py-3 font-medium">
                <span className="sr-only">Save assignment</span>
              </th>
              <th className="w-[14%] px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr
                key={person.id}
                className={`border-b border-zinc-100 last:border-0 ${
                  person.active ? "" : "bg-zinc-50"
                }`}
              >
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                      {person.name}
                      {person.active ? null : <InactiveBadge />}
                    </p>
                    <p className="truncate text-zinc-600" title={person.email}>
                      {person.email}
                    </p>
                    <p className="text-xs text-zinc-500">
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
                <td className="px-3 py-3">
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
