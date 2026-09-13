"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { retractRequest, type ActionState } from "@/app/actions/requests";
import { ConfirmDialog, formDataFromSubmit } from "@/components/confirm-dialog";
import type { RequestCurrency, StepAction } from "@/lib/db/schema";
import { formatAmount } from "@/lib/format";

const stampLabel: Record<Exclude<StepAction, "sent_back" | "retracted">, string> = {
  passed: "pass",
  approved: "approval",
  rejected: "rejection",
};

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
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    retractRequest,
    undefined,
  );
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData | null>(null);
  const what =
    retracting === "passed" || retracting === "approved" || retracting === "rejected"
      ? stampLabel[retracting]
      : "decision";
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
          Take back your {what} while nobody after you has signed. This is logged;
          it does not erase the earlier stamp.
        </p>
        <label className="block text-sm font-medium text-ink">
          Reason
          <textarea
            className="input-field w-full min-h-24"
            name="comment"
            required
            maxLength={1000}
            placeholder="Required"
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
          {pending ? "Retracting…" : "Retract"}
        </button>
      </form>
      <ConfirmDialog
        open={open}
        title={`Retract your ${what}?`}
        body={`${ref}${money}. This stays on the history.`}
        confirmLabel="Retract"
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
