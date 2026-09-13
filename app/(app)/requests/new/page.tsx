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
      <h1 className="text-2xl font-semibold text-zinc-900">New request</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Submit a request for people on the route to review or approve.
      </p>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
        <RequestForm
          defaultName={user.name}
          departmentName={departmentName}
          types={types}
        />
      </div>
    </section>
  );
}
