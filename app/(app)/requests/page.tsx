import { redirect } from "next/navigation";
import { listAll } from "@/app/actions/requests";
import { RequestTable } from "@/components/request-table";
import { getCurrentUser } from "@/lib/current-user";

export default async function AllRequestsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const items = await listAll();

  return (
    <section>
      <h1 className="text-2xl font-semibold text-zinc-900">All requests</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Every request in the company. Open one to see its route, files, and
        history.
      </p>

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No requests have been submitted yet.
        </p>
      ) : (
        <RequestTable items={items} showRequester />
      )}
    </section>
  );
}
