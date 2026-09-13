import Link from "next/link";
import { listInbox, listInboxHistory } from "@/app/actions/requests";
import { RequestTitleLink, RequestTypeCell } from "@/components/request-table";
import { StatusBadge } from "@/components/status-badge";
import { LocalDate } from "@/components/local-date";
import type { StepAction, StepKind } from "@/lib/db/schema";
import { formatAmount } from "@/lib/format";
import { getTranslator } from "@/lib/i18n-server";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const isHistory = view === "history";
  const t = await getTranslator();
  const waiting = isHistory ? [] : await listInbox();
  const history = isHistory ? await listInboxHistory() : [];

  const actionLabel: Record<StepAction, string> = {
    passed: t("stepAction.passed"),
    approved: t("stepAction.approved"),
    sent_back: t("stepAction.sent_back"),
    rejected: t("stepAction.rejected"),
    retracted: t("stepAction.retracted"),
  };
  const kindLabel: Record<StepKind, string> = {
    review: t("stepKind.review"),
    approve: t("stepKind.approve"),
  };

  return (
    <section>
      <h1 className="page-title">{t("inbox.title")}</h1>
      <p className="page-lead">
        {isHistory ? t("inbox.historyLead") : t("inbox.waitingLead")}
      </p>

      <div className="mt-6 flex gap-5 border-b border-line text-sm">
        <Link href="/approvals" className={isHistory ? "tab-link" : "tab-link-active"}>
          {t("inbox.waiting")}
        </Link>
        <Link
          href="/approvals?view=history"
          className={isHistory ? "tab-link-active" : "tab-link"}
        >
          {t("inbox.history")}
        </Link>
      </div>

      {isHistory ? (
        history.length === 0 ? (
          <p className="panel-empty">{t("inbox.emptyHistory")}</p>
        ) : (
          <div className="card mt-6 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("table.type")}</th>
                  <th>{t("table.title")}</th>
                  <th>{t("table.requester")}</th>
                  <th>{t("table.yourAction")}</th>
                  <th>{t("table.amount")}</th>
                  <th>{t("table.status")}</th>
                  <th>{t("table.acted")}</th>
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
        <p className="panel-empty">{t("inbox.emptyWaiting")}</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t("table.type")}</th>
                <th>{t("table.title")}</th>
                <th>{t("table.requester")}</th>
                <th>{t("table.step")}</th>
                <th>{t("table.amount")}</th>
                <th>{t("table.status")}</th>
                <th>{t("table.submitted")}</th>
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
                  <td>
                    {t("inbox.stepLine", {
                      kind: kindLabel[item.stepKind],
                      position: item.waitingOn,
                    })}
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
