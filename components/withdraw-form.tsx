"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { withdrawRequest, type ActionState } from "@/app/actions/requests";
import { ConfirmDialog, formDataFromSubmit } from "@/components/confirm-dialog";

export function WithdrawForm({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    withdrawRequest,
    undefined,
  );
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FormData | null>(null);

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
        className="rounded-lg border border-zinc-200 bg-white p-4"
      >
        <input type="hidden" name="requestId" value={requestId} />
        <p className="text-sm text-zinc-600">
          You can withdraw this request while nobody has passed, approved, sent
          it back, or rejected it.
        </p>
        {state?.error ? (
          <p className="mt-2 text-sm text-rose-700" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-60"
        >
          {pending ? "Withdrawing…" : "Withdraw request"}
        </button>
      </form>
      <ConfirmDialog
        open={open}
        title="Withdraw this request?"
        body="It will leave everyone's inbox. You can submit a new request if you still need it."
        confirmLabel="Withdraw"
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
