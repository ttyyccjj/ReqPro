import Link from "next/link";
import { listMine } from "@/app/actions/requests";
import { LiveRefresh } from "@/components/inbox-live";
import { RequestTable } from "@/components/request-table";

export default async function HomePage() {
  const items = await listMine();

  return (
    <section>
      <LiveRefresh />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">My requests</h1>
          <p className="page-lead">Requests you have submitted for approval.</p>
        </div>
        <Link href="/requests/new" className="btn-primary">
          New request
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="panel-empty">No requests yet. Submit one to start an approval.</p>
      ) : (
        <RequestTable items={items} />
      )}
    </section>
  );
}
