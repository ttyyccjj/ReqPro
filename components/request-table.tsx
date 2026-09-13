import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { Request } from "@/lib/db/schema";
import { LocalDate } from "@/components/local-date";
import { formatAmount } from "@/lib/format";

export type RequestRow = Request & { waitingOn: string | null };

export function RequestTypeCell({
  type,
  number,
}: {
  type: string | null;
  number: string | null;
}) {
  return (
    <div>
      <p>{type ?? "—"}</p>
      {number ? (
        <p className="mt-0.5 font-mono text-xs text-zinc-500">{number}</p>
      ) : null}
    </div>
  );
}

export function RequestTitleLink({ id, title }: { id: string; title: string }) {
  return (
    <Link
      href={`/requests/${id}`}
      title={title}
      className="line-clamp-2 break-words font-medium text-zinc-900 hover:underline"
    >
      {title}
    </Link>
  );
}

export function RequestTable({
  items,
  showRequester = false,
}: {
  items: RequestRow[];
  showRequester?: boolean;
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Title</th>
            {showRequester ? (
              <th className="px-4 py-3 font-medium">Requester</th>
            ) : null}
            <th className="px-4 py-3 font-medium">Department</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Waiting on</th>
            <th className="px-4 py-3 font-medium">Submitted</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-3 text-zinc-600">
                <RequestTypeCell type={item.type} number={item.number} />
              </td>
              <td className="max-w-[16rem] px-4 py-3">
                <RequestTitleLink id={item.id} title={item.title} />
              </td>
              {showRequester ? (
                <td className="px-4 py-3 text-zinc-600">{item.requesterName}</td>
              ) : null}
              <td className="px-4 py-3 text-zinc-600">{item.department}</td>
              <td className="px-4 py-3 text-zinc-600">
                {formatAmount(item.amount, item.currency)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {item.status === "pending" && item.waitingOn ? item.waitingOn : "—"}
              </td>
              <td className="px-4 py-3 text-zinc-600">
                <LocalDate value={item.createdAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
