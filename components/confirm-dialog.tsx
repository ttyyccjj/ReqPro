"use client";

import { useEffect, useId, useRef, type FormEvent } from "react";
import { useT } from "@/components/locale-provider";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "default",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "ok" | "warn" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const resolvedCancel = cancelLabel ?? t("confirm.cancel");

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  const confirmClass =
    tone === "danger"
      ? "btn-danger"
      : tone === "warn"
        ? "btn-warn"
        : tone === "ok"
          ? "btn-ok"
          : "btn-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("confirm.close")}
        className="absolute inset-0 bg-slate/40"
        disabled={pending}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card-accent card relative w-full max-w-md p-5 shadow-[0_8px_24px_-4px_rgba(43,46,52,0.16)]"
      >
        <h2 id={titleId} className="text-base font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="btn-ghost"
          >
            {resolvedCancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={confirmClass}
          >
            {pending ? t("confirm.working") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function formDataFromSubmit(event: FormEvent<HTMLFormElement>) {
  const formData = new FormData(event.currentTarget);
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  if (submitter instanceof HTMLButtonElement && submitter.name) {
    formData.set(submitter.name, submitter.value);
  }
  return formData;
}
