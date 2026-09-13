"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { withdrawRequest, type ActionState } from "@/app/actions/requests";
import { ConfirmDialog, formDataFromSubmit } from "@/components/confirm-dialog";
import { useT } from "@/components/locale-provider";

export function WithdrawForm({ requestId }: { requestId: string }) {
  const t = useT();
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
        className="card p-4"
      >
        <input type="hidden" name="requestId" value={requestId} />
        <p className="text-sm text-muted">
          {t("withdraw.help")}
        </p>
        {state?.error ? (
          <p className="mt-2 text-sm text-rose-700" role="alert">
            {state.error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="btn-ghost mt-3"
        >
          {pending ? t("withdraw.pending") : t("withdraw.button")}
        </button>
      </form>
      <ConfirmDialog
        open={open}
        title={t("withdraw.confirmTitle")}
        body={t("withdraw.confirmBody")}
        confirmLabel={t("withdraw.confirm")}
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
