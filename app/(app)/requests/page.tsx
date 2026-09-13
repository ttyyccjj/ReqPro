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
      <h1 className="page-title">All requests</h1>
      <p className="page-lead">
        Every request in the company. Open one to see its route, files, and
        history.
      </p>

      {items.length === 0 ? (
        <p className="panel-empty">No requests have been submitted yet.</p>
      ) : (
        <RequestTable items={items} showRequester />
      )}
    </section>
  );
}
