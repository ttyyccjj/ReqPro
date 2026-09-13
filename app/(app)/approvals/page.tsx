import Link from "next/link";
import { listInbox, listInboxHistory } from "@/app/actions/requests";
import { RequestTitleLink, RequestTypeCell } from "@/components/request-table";
import { StatusBadge } from "@/components/status-badge";
import type { StepAction } from "@/lib/db/schema";
import { LocalDate } from "@/components/local-date";
import { formatAmount } from "@/lib/format";

const actionLabel: Record<StepAction, string> = {
  passed: "Passed",
  approved: "Approved",
  sent_back: "Sent back",
  rejected: "Rejected",
  retracted: "Retracted",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isHistory = view === "history";
  const waiting = isHistory ? [] : await listInbox();
  const history = isHistory ? await listInboxHistory() : [];

  return (
    <section>
      <h1 className="page-title">Inbox</h1>
      <p className="page-lead">
        {isHistory
          ? "Requests you have already passed, approved, sent back, or rejected."
          : "Requests waiting on you for the current review or approve step."}
      </p>

      <div className="mt-6 flex gap-5 border-b border-line text-sm">
        <Link href="/approvals" className={isHistory ? "tab-link" : "tab-link-active"}>
          Waiting
        </Link>
        <Link
          href="/approvals?view=history"
          className={isHistory ? "tab-link-active" : "tab-link"}
        >
          History
        </Link>
      </div>

      {isHistory ? (
        history.length === 0 ? (
          <p className="panel-empty">You have not signed any requests yet.</p>
        ) : (
          <div className="card mt-6 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Requester</th>
                  <th>Your action</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Acted</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <RequestTypeCell type={item.type} number={item.number} />
                    </td>
                    <td className="max-w-[16rem]">
                      <RequestTitleLink id={item.id} title={item.title} />
                    </td>
                    <td>{item.requesterName}</td>
                    <td>{actionLabel[item.yourAction]}</td>
                    <td className="font-mono">{formatAmount(item.amount, item.currency)}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="font-mono">
                      <LocalDate value={item.actedAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : waiting.length === 0 ? (
        <p className="panel-empty">Nothing waiting on you.</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Title</th>
                <th>Requester</th>
                <th>Step</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {waiting.map((item) => (
                <tr key={item.id}>
                  <td>
                    <RequestTypeCell type={item.type} number={item.number} />
                  </td>
                  <td className="max-w-[16rem]">
                    <RequestTitleLink id={item.id} title={item.title} />
                  </td>
                  <td>{item.requesterName}</td>
                  <td className="capitalize">
                    {item.stepKind} · {item.waitingOn}
                  </td>
                  <td className="font-mono">{formatAmount(item.amount, item.currency)}</td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="font-mono">
                    <LocalDate value={item.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
