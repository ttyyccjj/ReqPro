"use client";

import { useActionState, useRef, useState } from "react";
import { createRequest, updateRequest, type ActionState } from "@/app/actions/requests";
import { useT } from "@/components/locale-provider";
import {
  ATTACHMENT_ACCEPT,
  MAX_FILE_BYTES,
  MAX_FILES,
  canPreviewAttachment,
} from "@/lib/attachment-limits";
import type { Request, RequestCurrency } from "@/lib/db/schema";
import {
  formatBytes,
  formatGroupedAmount,
  parseAmountInput,
  resolveCurrency,
} from "@/lib/format";
import type { AttachmentItem } from "@/components/attachment-list";
import { optimizeImageFile } from "@/lib/optimize-image";
import { inputClass } from "@/lib/ui";

const fieldClass = inputClass;

type PickedFile = {
  id: string;
  file: File;
};

function sameFile(left: File, right: File) {
  return (
    left.name === right.name &&
    left.size === right.size &&
    left.lastModified === right.lastModified
  );
}

export function RequestForm({
  defaultName,
  departmentName,
  request,
  attachments = [],
  types,
}: {
  defaultName: string;
  departmentName: string | null;
  request?: Request;
  attachments?: AttachmentItem[];
  types: { id: string; name: string }[];
}) {
  const t = useT();
  const action = request ? updateRequest : createRequest;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );
  const [selected, setSelected] = useState<PickedFile[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [currency, setCurrency] = useState<RequestCurrency>(
    resolveCurrency(request?.currency),
  );
  const [amountText, setAmountText] = useState(
    request?.amount == null ? "" : formatGroupedAmount(request.amount, resolveCurrency(request.currency)),
  );
  const [typeId, setTypeId] = useState(
    types.find((type) => type.name === request?.type)?.id ?? types[0]?.id ?? "",
  );
  const selectedRef = useRef<PickedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = attachments.filter((file) => !removed.has(file.id)).length;
  const tooLarge = selected.some((item) => item.file.size > MAX_FILE_BYTES);
  const slotsLeft = Math.max(0, MAX_FILES - remaining - selected.length);

  function setPickedFiles(next: PickedFile[]) {
    selectedRef.current = next;
    setSelected(next);
  }

  function dropPickedFile(id: string) {
    setPickedFiles(selectedRef.current.filter((file) => file.id !== id));
    setLimitWarning(null);
  }

  async function addPickedFiles(incoming: File[]) {
    const current = selectedRef.current;
    const room = Math.max(0, MAX_FILES - remaining - current.length);
    const unique = incoming.filter(
      (file) => !current.some((item) => sameFile(item.file, file)),
    );
    const accepted = unique.slice(0, room);
    const skipped = unique.length - accepted.length;

    setLimitWarning(
      room === 0 || skipped > 0
        ? t("requestForm.extraFiles", { max: MAX_FILES })
        : null,
    );
    if (accepted.length === 0) return;

    setOptimizing(true);
    try {
      const files = await Promise.all(accepted.map(optimizeImageFile));
      setPickedFiles([
        ...current,
        ...files.map((file) => ({ id: crypto.randomUUID(), file })),
      ]);
    } finally {
      setOptimizing(false);
    }
  }

  function submitWithAttachments(formData: FormData) {
    formData.delete("attachments");
    for (const item of selectedRef.current) {
      formData.append("attachments", item.file);
    }
    formAction(formData);
  }

  return (
    <form action={submitWithAttachments} className="space-y-4">
      {request ? <input type="hidden" name="requestId" value={request.id} /> : null}
      <label className="block text-sm font-medium text-ink">
        {t("requestForm.type")}
        <select
          className={fieldClass}
          name="typeId"
          required
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
          disabled={types.length === 0}
        >
          {types.length === 0 ? <option value="">{t("requestForm.noTypes")}</option> : null}
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {types.length === 0 ? (
          <p className="mt-1 text-xs font-normal text-muted">
            {t("requestForm.noTypesHelp")}
          </p>
        ) : request?.type && !types.some((type) => type.name === request.type) ? (
          <p className="mt-1 text-xs font-normal text-muted">
            {t("requestForm.previousType", { type: request.type })}
          </p>
        ) : null}
      </label>
      <label className="block text-sm font-medium text-ink">
        {t("requestForm.title")}
        <input
          className={fieldClass}
          name="title"
          required
          maxLength={120}
          defaultValue={request?.title}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block text-sm font-medium text-ink">
          {t("requestForm.requester")}
          <p className="mt-1 rounded-sm border border-line bg-canvas px-3 py-2 text-sm font-normal text-muted">
            {request?.requesterName ?? defaultName}
          </p>
        </div>
        <div className="block text-sm font-medium text-ink">
          {t("requestForm.department")}
          <p className="mt-1 rounded-sm border border-line bg-canvas px-3 py-2 text-sm font-normal text-muted">
            {departmentName ?? t("requestForm.notAssigned")}
          </p>
          {!departmentName ? (
            <p className="mt-1 text-xs font-normal text-muted">
              {t("requestForm.noDepartmentHelp")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="block text-sm font-medium text-ink">
        <label htmlFor="request-amount">{t("requestForm.amount")}</label>
        <div className="mt-1 flex gap-2">
          <select
            className="input-field mt-0 w-28 shrink-0"
            name="currency"
            aria-label={t("requestForm.currency")}
            value={currency}
            onChange={(event) => {
              const next = resolveCurrency(event.target.value);
              setCurrency(next);
              const parsed = parseAmountInput(amountText);
              if (parsed != null) {
                setAmountText(formatGroupedAmount(parsed, next));
              }
            }}
          >
            <option value="PHP">PHP</option>
            <option value="JPY">{t("requestForm.yen")}</option>
          </select>
          <input
            id="request-amount"
            className={`${fieldClass} mt-0 min-w-0 flex-1`}
            name="amount"
            inputMode={currency === "JPY" ? "numeric" : "decimal"}
            value={amountText}
            onChange={(event) => {
              const allowed = currency === "JPY" ? /[^\d,]/g : /[^\d.,]/g;
              const raw = event.target.value.replace(allowed, "");
              const normalized = raw.replace(/,/g, "");
              if (normalized === "" || normalized === ".") {
                setAmountText(raw);
                return;
              }
              const parsed = parseAmountInput(raw);
              if (parsed == null) {
                setAmountText(raw);
                return;
              }
              if (currency === "PHP" && normalized.endsWith(".")) {
                setAmountText(`${formatGroupedAmount(Math.trunc(parsed), currency)}.`);
                return;
              }
              setAmountText(formatGroupedAmount(parsed, currency));
            }}
            onBlur={() => {
              const parsed = parseAmountInput(amountText);
              setAmountText(parsed == null ? amountText.trim() : formatGroupedAmount(parsed, currency));
            }}
          />
        </div>
      </div>
      <label className="block text-sm font-medium text-ink">
        {t("requestForm.details")}
        <textarea
          className={`${fieldClass} min-h-32`}
          name="details"
          required
          maxLength={4000}
          defaultValue={request?.details}
        />
      </label>
      <div className="block text-sm font-medium text-ink">
        {t("requestForm.attachments")}
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          tabIndex={-1}
          onChange={(event) => {
            const incoming = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (incoming.length === 0) return;
            addPickedFiles(incoming);
          }}
        />
        {attachments.length > 0 || selected.length > 0 ? (
          <ul className="mt-2 space-y-2 font-normal">
            {attachments.map((file) => {
              const dropping = removed.has(file.id);
              return (
                <li
                  key={file.id}
                  className={`flex items-center justify-between gap-3 rounded-sm border border-line px-3 py-2 ${
                    dropping ? "bg-wash opacity-70" : ""
                  }`}
                >
                  {dropping ? (
                    <input type="hidden" name="removeAttachmentIds" value={file.id} />
                  ) : null}
                  <a
                    href={`/api/attachments/${file.id}`}
                    className={`min-w-0 truncate underline-offset-2 hover:underline ${
                      dropping ? "text-muted line-through" : "text-ink"
                    }`}
                    {...(canPreviewAttachment(file.mimeType)
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {file.originalName}
                    <span className="ml-2 text-xs text-muted no-underline">
                      {formatBytes(file.sizeBytes)}
                    </span>
                  </a>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-muted hover:text-ink"
                    onClick={() => {
                      setRemoved((current) => {
                        const next = new Set(current);
                        if (next.has(file.id)) next.delete(file.id);
                        else next.add(file.id);
                        return next;
                      });
                      setLimitWarning(null);
                    }}
                  >
                    {dropping ? t("requestForm.keep") : t("requestForm.remove")}
                  </button>
                </li>
              );
            })}
            {selected.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-sm border border-line px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-muted">
                  {item.file.name}
                  <span className="ml-2 text-xs text-muted">
                    {formatBytes(item.file.size)}
                    {item.file.size > MAX_FILE_BYTES ? t("requestForm.overLimit") : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-muted hover:text-ink"
                  onClick={() => dropPickedFile(item.id)}
                >
                  {t("requestForm.remove")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-ghost py-1.5"
            disabled={slotsLeft === 0 || optimizing}
            onClick={() => fileInputRef.current?.click()}
          >
            {optimizing ? t("requestForm.compressing") : t("requestForm.addFiles")}
          </button>
          <p className="text-xs font-normal text-muted">{t("requestForm.attachHint")}</p>
        </div>
        {limitWarning ? (
          <p className="mt-1 text-xs font-normal text-rose-700" role="alert">
            {limitWarning}
          </p>
        ) : slotsLeft === 0 && remaining + selected.length >= MAX_FILES ? (
          <p className="mt-1 text-xs font-normal text-muted">
            {t("requestForm.limitReached", { max: MAX_FILES })}
          </p>
        ) : null}
      </div>
      {state?.error ? (
        <p className="text-sm text-rose-700" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || optimizing || !departmentName || tooLarge || types.length === 0}
        className="btn-primary"
      >
        {pending
          ? t("requestForm.saving")
          : request
            ? t("requestForm.resubmit")
            : t("requestForm.submit")}
      </button>
    </form>
  );
}
