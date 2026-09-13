"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { decideRequest, type ActionState } from "@/app/actions/requests";
import { ConfirmDialog, formDataFromSubmit } from "@/components/confirm-dialog";
import type { RequestCurrency, StepAction, StepKind } from "@/lib/db/schema";
import { formatAmount } from "@/lib/format";

const actionVerb: Partial<Record<StepAction, string>> = {
  passed: "Pass",
  approved: "Approve",
  sent_back: "Send back",
  rejected: "Reject",
};

export function DecideForm({
  requestId,
  kind,
  number,
  title,
  amount,
  currency,
}: {
  requestId: string;
  kind: StepKind;
  number: string | null;
  title: string;
  amount: number | null;
  currency: RequestCurrency | null;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    decideRequest,
    undefined,
  );
  const [prompt, setPrompt] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    tone: "ok" | "warn" | "danger";
    data: FormData;
  } | null>(null);
  const isReview = kind === "review";

  function askToConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action =
      submitter instanceof HTMLButtonElement ? submitter.value : "";
    const verb = actionVerb[action as StepAction];
    if (!verb) return;

    const ref = [number, `"${title}"`].filter(Boolean).join(" ");
    const money =
      amount == null ? "" : ` · ${formatAmount(amount, currency)}`;
    setPrompt({
      title: `${verb} this request?`,
      body: `${ref}${money}`,
      confirmLabel: verb,
      tone:
        action === "rejected"
          ? "danger"
          : action === "sent_back"
            ? "warn"
            : "ok",
      data: formDataFromSubmit(event),
    });
  }

  return (
    <>
      <form
        action={formAction}
        onSubmit={askToConfirm}
        className="card space-y-3 bg-wash p-4"
      >
        <input type="hidden" name="requestId" value={requestId} />
        <label className="block text-sm font-medium text-ink">
          Comment
          <textarea
            className="input-field w-full min-h-24"
            name="comment"
            maxLength={1000}
            placeholder={
              isReview
                ? "Required if you send this back"
                : "Required if you send this back or reject"
            }
          />
        </label>
        {state?.error ? (
          <p className="text-sm text-[#93000a]" role="alert">
            {state.error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="action"
            value={isReview ? "passed" : "approved"}
            disabled={pending}
            className="btn-ok"
          >
            {isReview ? "Pass" : "Approve"}
          </button>
          <button
            type="submit"
            name="action"
            value="sent_back"
            disabled={pending}
            className="btn-warn"
          >
            Send back
          </button>
          {isReview ? null : (
            <button
              type="submit"
              name="action"
              value="rejected"
              disabled={pending}
              className="btn-danger"
            >
              Reject
            </button>
          )}
        </div>
      </form>
      <ConfirmDialog
        open={Boolean(prompt)}
        title={prompt?.title ?? ""}
        body={prompt?.body ?? ""}
        confirmLabel={prompt?.confirmLabel ?? "Confirm"}
        tone={prompt?.tone ?? "ok"}
        pending={pending}
        onCancel={() => setPrompt(null)}
        onConfirm={() => {
          if (!prompt) return;
          const data = prompt.data;
          startTransition(() => {
            formAction(data);
          });
          setPrompt(null);
        }}
      />
    </>
  );
}
