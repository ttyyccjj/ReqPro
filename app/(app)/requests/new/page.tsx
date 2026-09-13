import { getActiveDepartmentName } from "@/app/actions/departments";
import { listActiveRequestTypes } from "@/app/actions/request-types";
import { RequestForm } from "@/components/request-form";
import { requireUser } from "@/lib/current-user";

export default async function NewRequestPage() {
  const user = await requireUser();
  const [departmentName, types] = await Promise.all([
    user.departmentId ? getActiveDepartmentName(user.departmentId) : null,
    listActiveRequestTypes(),
  ]);

  return (
    <section className="max-w-2xl">
      <h1 className="page-title">New request</h1>
      <p className="page-lead">
        Submit a request for people on the route to review or approve.
      </p>
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
