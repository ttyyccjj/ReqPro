import { redirect } from "next/navigation";
import { listDepartments } from "@/app/actions/departments";
import { listPositions } from "@/app/actions/positions";
import { listUsers, setUserActive } from "@/app/actions/users";
import { ActiveToggleForm, InactiveBadge } from "@/components/active-toggle";
import { PersonAssignment } from "@/components/person-form";
import { getCurrentUser } from "@/lib/current-user";
import { getTranslator } from "@/lib/i18n-server";
import { LocalDate } from "@/components/local-date";

export default async function PeoplePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const [people, positions, departmentRows, t] = await Promise.all([
    listUsers(),
    listPositions(),
    listDepartments(),
    getTranslator(),
  ]);

  return (
    <section>
      <h1 className="page-title">{t("people.title")}</h1>
      <p className="page-lead">{t("people.lead")}</p>

      <div className="card mt-6 overflow-x-auto">
        <table className="data-table table-fixed">
          <thead>
            <tr>
              <th className="w-[28%]">{t("people.person")}</th>
              <th className="w-[12%]">{t("people.role")}</th>
              <th className="w-[20%]">{t("people.position")}</th>
              <th className="w-[18%]">{t("people.department")}</th>
              <th className="w-[8%]">
                <span className="sr-only">{t("people.saveAssignment")}</span>
              </th>
              <th className="w-[14%]">{t("people.status")}</th>
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
