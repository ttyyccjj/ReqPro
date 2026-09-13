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
          <h1 className="text-2xl font-semibold text-zinc-900">My requests</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Requests you have submitted for approval.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          New request
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          No requests yet. Submit one to start an approval.
        </p>
      ) : (
        <RequestTable items={items} />
      )}
    </section>
  );
}
