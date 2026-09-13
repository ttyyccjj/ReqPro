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

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">{detail.title}</h1>
          <StatusBadge status={detail.status} />
        </div>
        {detail.number ? (
          <p className="mt-1 font-mono text-sm text-zinc-500">{detail.number}</p>
        ) : null}
        <p className="mt-1 text-sm text-zinc-500">
          Submitted <LocalDate value={detail.createdAt} />
        </p>
      </div>

      {detail.status === "changes_requested" && detail.sendBackReason ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          Changes requested: {detail.sendBackReason}
        </p>
      ) : null}

      <dl className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-6 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Requester</dt>
          <dd className="mt-1 text-sm text-zinc-900">{detail.requesterName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Department</dt>
          <dd className="mt-1 text-sm text-zinc-900">{detail.department}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Type</dt>
          <dd className="mt-1 text-sm text-zinc-900">{detail.type ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Amount</dt>
          <dd className="mt-1 text-sm text-zinc-900">{formatAmount(detail.amount, detail.currency)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-zinc-500">Details</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{detail.details}</dd>
        </div>
        {detail.rejectionReason ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Rejection reason</dt>
            <dd className="mt-1 text-sm text-zinc-900">{detail.rejectionReason}</dd>
          </div>
        ) : null}
        {detail.decidedAt ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Decision date</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              <LocalDate value={detail.decidedAt} />
            </dd>
          </div>
        ) : null}
        {detail.attachments.length > 0 ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Attachments</dt>
            <dd className="mt-2">
              <AttachmentList items={detail.attachments} />
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Route</h2>
        <ol className="space-y-2">
          {detail.steps.map((step, index) => (
            <li
              key={step.id}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-zinc-900">
                  {index + 1}. {step.kind === "review" ? "Review" : "Approve"} · {step.positionName}
                  {step.isFinalApprove ? " · Final" : ""}
                </p>
                <span className="text-xs capitalize text-zinc-500">
                  {step.state === "skipped" ? "skipped" : step.state}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {step.kind === "review"
                  ? "At least 1 reviewer must pass"
                  : step.rule === "everyone"
                    ? "Everyone in this position must approve"
                    : "At least 1 approver must approve"}
              </p>
              {step.state === "skipped" ? (
                <p className="mt-2 text-xs text-zinc-500">
                  Skipped because the requester already sits at or above this
                  step on the route.
                </p>
              ) : step.assignees.length === 0 && step.state === "active" ? (
                <p className="mt-2 text-xs text-amber-800">
                  No one can act on this step. There is no later step to skip to.
                </p>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">
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
          ))}
        </ol>
      </div>

      {detail.actions.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-900">History</h2>
          <ul className="space-y-2 text-sm">
            {detail.actions.map((action) => (
              <li key={action.id} className="rounded-md border border-zinc-100 bg-white px-3 py-2">
                <span className="font-medium">{action.userName}</span>{" "}
                <span className="text-zinc-600">{action.action.replace("_", " ")}</span>
                <span className="text-zinc-400">
                  {" "}
                  · <LocalDate value={action.createdAt} />
                </span>
                {action.comment ? (
                  <p className="mt-1 text-zinc-700">{action.comment}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {detail.status === "withdrawn" ? (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
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

      {detail.isRequester && detail.status === "changes_requested" ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Update and resubmit</h2>
          <RequestForm
            defaultName={user.name}
            departmentName={departmentName}
            request={detail}
            attachments={detail.attachments}
            types={types}
          />
        </div>
      ) : null}
    </section>
  );
}
