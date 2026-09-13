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
        className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
      >
        <input type="hidden" name="requestId" value={requestId} />
        <p className="text-sm text-amber-950">
          Take back your {what} while nobody after you has signed. This is logged;
          it does not erase the earlier stamp.
        </p>
        <label className="block text-sm font-medium text-zinc-700">
          Reason
          <textarea
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
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
          className="rounded-md border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60"
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
