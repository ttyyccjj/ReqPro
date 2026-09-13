"use client";

import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { useT } from "@/components/locale-provider";
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
  const t = useT();
  return (
    <div>
      <p>{type ?? t("common.dash")}</p>
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
  const t = useT();
  return (
    <div className="card mt-6 overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("table.type")}</th>
            <th>{t("table.title")}</th>
            {showRequester ? <th>{t("table.requester")}</th> : null}
            <th>{t("table.department")}</th>
            <th>{t("table.amount")}</th>
            <th>{t("table.status")}</th>
            <th>{t("table.waitingOn")}</th>
            <th>{t("table.submitted")}</th>
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
                {item.status === "pending" && item.waitingOn ? item.waitingOn : t("common.dash")}
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
