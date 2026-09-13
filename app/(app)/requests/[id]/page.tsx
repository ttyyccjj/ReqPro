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

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, detail] = await Promise.all([requireUser(), getRequest(id)]);
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
            Submitted <LocalDate value={detail.createdAt} />
          </span>
        </div>
        <h1 className="page-title mt-3">{detail.title}</h1>
        <p className="page-lead">
          {detail.requesterName} · {detail.department}
        </p>
      </div>

      {detail.status === "changes_requested" && detail.sendBackReason ? (
        <p className="rounded-sm border border-[#208b9b] bg-[#e0f2fe] px-4 py-3 text-sm text-[#075985]">
          Changes requested: {detail.sendBackReason}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <dl className="card grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <dt className="label-caps">Requester</dt>
              <dd className="mt-1 text-sm text-ink">{detail.requesterName}</dd>
            </div>
            <div>
              <dt className="label-caps">Department</dt>
              <dd className="mt-1 text-sm text-ink">{detail.department}</dd>
            </div>
            <div>
              <dt className="label-caps">Type</dt>
              <dd className="mt-1 text-sm text-ink">{detail.type ?? "—"}</dd>
            </div>
            <div>
              <dt className="label-caps">Amount</dt>
              <dd className="mt-1 font-mono text-sm text-ink">
                {formatAmount(detail.amount, detail.currency)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="label-caps">Details</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-ink">{detail.details}</dd>
            </div>
            {detail.rejectionReason ? (
              <div className="sm:col-span-2">
                <dt className="label-caps">Rejection reason</dt>
                <dd className="mt-1 text-sm text-ink">{detail.rejectionReason}</dd>
              </div>
            ) : null}
            {detail.decidedAt ? (
              <div className="sm:col-span-2">
                <dt className="label-caps">Decision date</dt>
                <dd className="mt-1 font-mono text-sm text-ink">
                  <LocalDate value={detail.decidedAt} />
                </dd>
              </div>
            ) : null}
            {detail.attachments.length > 0 ? (
              <div className="sm:col-span-2">
                <dt className="label-caps">Attachments</dt>
                <dd className="mt-2">
                  <AttachmentList items={detail.attachments} />
                </dd>
              </div>
            ) : null}
          </dl>

          {detail.actions.length > 0 ? (
            <div className="card space-y-3 p-6">
              <h2 className="section-title">History</h2>
              <ul className="space-y-2 text-sm">
                {detail.actions.map((action) => (
                  <li key={action.id} className="rounded-sm border border-line bg-wash px-3 py-2">
                    <span className="font-medium">{action.userName}</span>{" "}
                    <span className="text-muted">{action.action.replace("_", " ")}</span>
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
              This request was withdrawn
              {detail.decidedAt ? (
                <>
                  {" "}
                  <LocalDate value={detail.decidedAt} />
                </>
              ) : null}
              . Nobody had signed off yet, so it left the inbox.
            </p>
          ) : null}

          {detail.isRequester && detail.status === "changes_requested" ? (
            <div className="card p-6">
              <h2 className="section-title mb-4">Update and resubmit</h2>
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
              <h2 className="section-title">Route</h2>
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
                      {step.kind === "review" ? "Review" : "Approve"} · {step.positionName}
                      {step.isFinalApprove ? " · Final" : ""}
                    </p>
                    <p className="label-caps mt-1">
                      {step.state === "skipped" ? "skipped" : step.state}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {step.kind === "review"
                        ? "At least 1 reviewer must pass"
                        : step.rule === "everyone"
                          ? "Everyone in this position must approve"
                          : "At least 1 approver must approve"}
                    </p>
                    {step.state === "skipped" ? (
                      <p className="mt-2 text-xs text-muted">
                        Skipped because the requester already sits at or above this
                        step on the route.
                      </p>
                    ) : step.assignees.length === 0 && step.state === "active" ? (
                      <p className="mt-2 text-xs text-[#92400e]">
                        No one can act on this step. There is no later step to skip to.
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted">
                        Assignees:{" "}
                        {step.assignees.length === 0
                          ? "None yet"
                          : step.assignees
                              .map((assignee) =>
                                `${assignee.name}${assignee.completed ? " (done)" : ""}`,
                              )
                              .join(", ")}
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
