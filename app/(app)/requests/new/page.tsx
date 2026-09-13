import { getActiveDepartmentName } from "@/app/actions/departments";
import { listActiveRequestTypes } from "@/app/actions/request-types";
import { RequestForm } from "@/components/request-form";
import { requireUser } from "@/lib/current-user";
import { getTranslator } from "@/lib/i18n-server";

export default async function NewRequestPage() {
  const user = await requireUser();
  const [departmentName, types, t] = await Promise.all([
    user.departmentId ? getActiveDepartmentName(user.departmentId) : null,
    listActiveRequestTypes(),
    getTranslator(),
  ]);

  return (
    <section className="max-w-2xl">
      <h1 className="page-title">{t("newRequest.title")}</h1>
      <p className="page-lead">{t("newRequest.lead")}</p>
      <div className="card-accent card mt-6 p-6">
        <RequestForm
          defaultName={user.name}
          departmentName={departmentName}
          types={types}
        />
      </div>
    </section>
  );
}
