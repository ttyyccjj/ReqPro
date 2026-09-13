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
        <p className="mt-0.5 font-mono text-xs text-muted">{number}</p>
      ) : null}
    </div>
  );
}

export function RequestTitleLink({ id, title }: { id: string; title: string }) {
  return (
    <Link
      href={`/requests/${id}`}
      title={title}
      className="line-clamp-2 break-words font-medium text-ink hover:underline"
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
    <div className="card mt-6 overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Title</th>
            {showRequester ? <th>Requester</th> : null}
            <th>Department</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Waiting on</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <RequestTypeCell type={item.type} number={item.number} />
              </td>
              <td className="max-w-[16rem]">
                <RequestTitleLink id={item.id} title={item.title} />
              </td>
              {showRequester ? <td>{item.requesterName}</td> : null}
              <td>{item.department}</td>
              <td className="font-mono">{formatAmount(item.amount, item.currency)}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td>
                {item.status === "pending" && item.waitingOn ? item.waitingOn : "—"}
              </td>
              <td className="font-mono">
                <LocalDate value={item.createdAt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
