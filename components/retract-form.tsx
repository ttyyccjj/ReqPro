"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { retractRequest, type ActionState } from "@/app/actions/requests";
import { ConfirmDialog, formDataFromSubmit } from "@/components/confirm-dialog";
import { useT } from "@/components/locale-provider";
import type { RequestCurrency, StepAction } from "@/lib/db/schema";
import { formatAmount } from "@/lib/format";

export function RetractForm({
  requestId,
  number,
  title,
  amount,
  currency,
  retracting,
}: {
  requestId: string;
  number: string | null;
  title: string;
  amount: number | null;
  currency: RequestCurrency | null;
  retracting: StepAction;
}) {
  const t = useT();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    retractRequest,
    undefined,
  );
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData | null>(null);
  const stampLabel: Record<Exclude<StepAction, "sent_back" | "retracted">, string> = {
    passed: t("retract.stampPass"),
    approved: t("retract.stampApproval"),
    rejected: t("retract.stampRejection"),
  };
  const what =
    retracting === "passed" || retracting === "approved" || retracting === "rejected"
      ? stampLabel[retracting]
      : t("retract.stampDecision");
  const ref = [number, `"${title}"`].filter(Boolean).join(" ");
  const money = amount == null ? "" : ` · ${formatAmount(amount, currency)}`;

  function askToConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setData(formDataFromSubmit(event));
    setOpen(true);
  }

  return (
    <>
      <form
        action={formAction}
        onSubmit={askToConfirm}
        className="space-y-3 rounded-sm border border-[#e88d14] bg-[#fef3c7] p-4"
      >
        <input type="hidden" name="requestId" value={requestId} />
        <p className="text-sm text-[#92400e]">
          {t("retract.help", { what })}
        </p>
        <label className="block text-sm font-medium text-ink">
          {t("retract.reason")}
          <textarea
            className="input-field w-full min-h-24"
            name="comment"
            required
            maxLength={1000}
            placeholder={t("retract.required")}
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-rose-700" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="btn-ghost"
        >
          {pending ? t("retract.pending") : t("retract.button")}
        </button>
      </form>
      <ConfirmDialog
        open={open}
        title={t("retract.confirmTitle", { what })}
        body={t("retract.confirmBody", { ref: `${ref}${money}` })}
        confirmLabel={t("retract.button")}
        tone="danger"
        pending={pending}
        onCancel={() => {
          setOpen(false);
          setData(null);
        }}
        onConfirm={() => {
          if (!data) return;
          startTransition(() => {
            formAction(data);
          });
          setOpen(false);
          setData(null);
        }}
      />
    </>
  );
}
