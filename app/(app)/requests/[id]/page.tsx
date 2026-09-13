import { notFound } from "next/navigation";
import { getActiveDepartmentName } from "@/app/actions/departments";
import { listActiveRequestTypes } from "@/app/actions/request-types";
import { getRequest } from "@/app/actions/requests";
import { AttachmentList } from "@/components/attachment-list";
import { DecideForm } from "@/components/decide-form";
import { RequestForm } from "@/components/request-form";
import { StatusBadge } from "@/components/status-badge";
import { RetractForm } from "@/components/retract-form";
import { WithdrawForm } from "@/components/withdraw-form";
import { requireUser } from "@/lib/current-user";
import { LocalDate } from "@/components/local-date";
import { formatAmount } from "@/lib/format";
import { getTranslator } from "@/lib/i18n-server";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, detail, t] = await Promise.all([
    requireUser(),
    getRequest(id),
    getTranslator(),
  ]);
  const [departmentName, types] = await Promise.all([
    user.departmentId ? getActiveDepartmentName(user.departmentId) : null,
    listActiveRequestTypes(),
  ]);

  if (!detail) {
    notFound();
  }

  const activeIndex = detail.steps.findIndex((step) => step.state === "active");

  return (
    <section className="space-y-6">
      <div className="card-accent card p-6">
        <div className="flex flex-wrap items-center gap-2">
          {detail.number ? (
            <span className="rounded-sm bg-rail px-1.5 py-0.5 font-mono text-[12px] text-rail-ink">
              {detail.number}
            </span>
          ) : null}
          {detail.type ? (
            <span className="label-caps rounded-sm bg-[#e7eeff] px-1.5 py-0.5">{detail.type}</span>
          ) : null}
          <StatusBadge status={detail.status} />
          <span className="text-[12px] text-muted">
            {t("requestDetail.submitted")} <LocalDate value={detail.createdAt} />
          </span>
        </div>
        <h1 className="page-title mt-3">{detail.title}</h1>
        <p className="page-lead">
          {detail.requesterName} · {detail.department}
        </p>
      </div>

      {detail.status === "changes_requested" && detail.sendBackReason ? (
        <p className="rounded-sm border border-[#208b9b] bg-[#e0f2fe] px-4 py-3 text-sm text-[#075985]">
          {t("requestDetail.changesRequested", { reason: detail.sendBackReason })}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <dl className="card grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <dt className="label-caps">{t("requestDetail.requester")}</dt>
              <dd className="mt-1 text-sm text-ink">{detail.requesterName}</dd>
            </div>
            <div>
              <dt className="label-caps">{t("requestDetail.department")}</dt>
              <dd className="mt-1 text-sm text-ink">{detail.department}</dd>
            </div>
            <div>
              <dt className="label-caps">{t("requestDetail.type")}</dt>
              <dd className="mt-1 text-sm text-ink">{detail.type ?? t("common.dash")}</dd>
            </div>
            <div>
              <dt className="label-caps">{t("requestDetail.amount")}</dt>
              <dd className="mt-1 font-mono text-sm text-ink">
                {formatAmount(detail.amount, detail.currency)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="label-caps">{t("requestDetail.details")}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">{detail.details}</dd>
            </div>
            {detail.rejectionReason ? (
              <div className="sm:col-span-2">
                <dt className="label-caps">{t("requestDetail.rejectionReason")}</dt>
                <dd className="mt-1 text-sm text-ink">{detail.rejectionReason}</dd>
              </div>
            ) : null}
            {detail.decidedAt ? (
              <div className="sm:col-span-2">
                <dt className="label-caps">{t("requestDetail.decisionDate")}</dt>
                <dd className="mt-1 font-mono text-sm text-ink">
                  <LocalDate value={detail.decidedAt} />
                </dd>
              </div>
            ) : null}
            {detail.attachments.length > 0 ? (
              <div className="sm:col-span-2">
                <dt className="label-caps">{t("requestDetail.attachments")}</dt>
                <dd className="mt-2">
                  <AttachmentList items={detail.attachments} />
                </dd>
              </div>
            ) : null}
          </dl>

          {detail.actions.length > 0 ? (
            <div className="card space-y-3 p-6">
              <h2 className="section-title">{t("requestDetail.history")}</h2>
              <ul className="space-y-2 text-sm">
                {detail.actions.map((action) => (
                  <li key={action.id} className="rounded-sm border border-line bg-wash px-3 py-2">
                    <span className="font-medium">{action.userName}</span>{" "}
                    <span className="text-muted">
                      {action.action === "passed"
                        ? t("stepAction.passed")
                        : action.action === "approved"
                          ? t("stepAction.approved")
                          : action.action === "sent_back"
                            ? t("stepAction.sent_back")
                            : action.action === "rejected"
                              ? t("stepAction.rejected")
                              : t("stepAction.retracted")}
                    </span>
                    <span className="text-muted">
                      {" "}
                      · <LocalDate value={action.createdAt} />
                    </span>
                    {action.comment ? (
                      <p className="mt-1 text-ink">{action.comment}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {detail.status === "withdrawn" ? (
            <p className="rounded-sm border border-line bg-[#f1f5f9] px-4 py-3 text-sm text-[#475569]">
              {t("requestDetail.withdrawn")}
              {detail.decidedAt ? (
                <>
                  {" "}
                  (<LocalDate value={detail.decidedAt} />)
                </>
              ) : null}
            </p>
          ) : null}

          {detail.isRequester && detail.status === "changes_requested" ? (
            <div className="card p-6">
              <h2 className="section-title mb-4">{t("requestDetail.updateResubmit")}</h2>
              <RequestForm
                defaultName={user.name}
                departmentName={departmentName}
                request={detail}
                attachments={detail.attachments}
                types={types}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div className="card space-y-4 p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="section-title">{t("requestDetail.route")}</h2>
              {activeIndex >= 0 ? (
                <span className="font-mono text-[11px] text-muted">
                  {activeIndex + 1}/{detail.steps.length}
                </span>
              ) : null}
            </div>
            <ol className="space-y-3">
              {detail.steps.map((step, index) => {
                const done = step.state === "passed" || step.state === "skipped";
                const active = step.state === "active";
                return (
                  <li key={step.id} className="relative pl-7">
                    <span
                      className={`absolute top-0.5 left-0 flex h-5 w-5 items-center justify-center rounded-sm text-[11px] font-semibold ${
                        done
                          ? "bg-ok text-white"
                          : active
                            ? "bg-brand text-white"
                            : "bg-line text-muted"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium text-ink">
                      {step.kind === "review" ? t("requestDetail.review") : t("requestDetail.approve")} · {step.positionName}
                      {step.isFinalApprove ? ` · ${t("requestDetail.final")}` : ""}
                    </p>
                    <p className="label-caps mt-1">
                      {step.state === "pending"
                        ? t("stepState.pending")
                        : step.state === "active"
                          ? t("stepState.active")
                          : step.state === "passed"
                            ? t("stepState.passed")
                            : t("stepState.skipped")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {step.kind === "review"
                        ? t("requestDetail.reviewRule")
                        : step.rule === "everyone"
                          ? t("requestDetail.everyoneRule")
                          : t("requestDetail.anyApproverRule")}
                    </p>
                    {step.state === "skipped" ? (
                      <p className="mt-2 text-xs text-muted">
                        {t("requestDetail.skippedReason")}
                      </p>
                    ) : step.assignees.length === 0 && step.state === "active" ? (
                      <p className="mt-2 text-xs text-[#92400e]">
                        {t("requestDetail.noAssignee")}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted">
                        {t("requestDetail.assignees", {
                          list:
                            step.assignees.length === 0
                              ? t("requestDetail.noneYet")
                              : step.assignees
                                  .map((assignee) =>
                                    `${assignee.name}${assignee.completed ? t("requestDetail.done") : ""}`,
                                  )
                                  .join(", "),
                        })}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {detail.canAct && detail.activeStep ? (
            <DecideForm
              requestId={detail.id}
              kind={detail.activeStep.kind}
              number={detail.number}
              title={detail.title}
              amount={detail.amount}
              currency={detail.currency}
            />
          ) : null}

          {detail.canRetract && detail.retracting ? (
            <RetractForm
              requestId={detail.id}
              number={detail.number}
              title={detail.title}
              amount={detail.amount}
              currency={detail.currency}
              retracting={detail.retracting}
            />
          ) : null}

          {detail.canWithdraw ? <WithdrawForm requestId={detail.id} /> : null}
        </div>
      </div>
    </section>
  );
}
