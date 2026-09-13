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
      <h1 className="text-2xl font-semibold text-zinc-900">Inbox</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {isHistory
          ? "Requests you have already passed, approved, sent back, or rejected."
          : "Requests waiting on you for the current review or approve step."}
      </p>

      <div className="mt-6 flex gap-5 border-b border-zinc-200 text-sm">
        <Link
          href="/approvals"
          className={
            isHistory
              ? "pb-2 text-zinc-500 hover:text-zinc-900"
              : "border-b-2 border-zinc-900 pb-2 font-medium text-zinc-900"
          }
        >
          Waiting
        </Link>
        <Link
          href="/approvals?view=history"
          className={
            isHistory
              ? "border-b-2 border-zinc-900 pb-2 font-medium text-zinc-900"
              : "pb-2 text-zinc-500 hover:text-zinc-900"
          }
        >
          History
        </Link>
      </div>

      {isHistory ? (
        history.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            You have not signed any requests yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Requester</th>
                  <th className="px-4 py-3 font-medium">Your action</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Acted</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 text-zinc-600">
                      <RequestTypeCell type={item.type} number={item.number} />
                    </td>
                    <td className="max-w-[16rem] px-4 py-3">
                      <RequestTitleLink id={item.id} title={item.title} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{item.requesterName}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {actionLabel[item.yourAction]}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatAmount(item.amount, item.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      <LocalDate value={item.actedAt} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : waiting.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
          Nothing waiting on you.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Requester</th>
                <th className="px-4 py-3 font-medium">Step</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {waiting.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 text-zinc-600">
                    <RequestTypeCell type={item.type} number={item.number} />
                  </td>
                  <td className="max-w-[16rem] px-4 py-3">
                    <RequestTitleLink id={item.id} title={item.title} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{item.requesterName}</td>
                  <td className="px-4 py-3 capitalize text-zinc-600">
                    {item.stepKind} · {item.waitingOn}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatAmount(item.amount, item.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
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
