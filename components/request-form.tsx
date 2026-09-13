"use client";

import { useActionState, useRef, useState } from "react";
import { createRequest, updateRequest, type ActionState } from "@/app/actions/requests";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
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

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900";

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
  const action = request ? updateRequest : createRequest;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined,
  );
  const [selected, setSelected] = useState<PickedFile[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
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

  function addPickedFiles(incoming: File[]) {
    const current = selectedRef.current;
    const room = Math.max(0, MAX_FILES - remaining - current.length);
    const unique = incoming.filter(
      (file) => !current.some((item) => sameFile(item.file, file)),
    );
    const accepted = unique.slice(0, room);
    const skipped = unique.length - accepted.length;

    setLimitWarning(
      room === 0 || skipped > 0
        ? `You can attach ${MAX_FILES} files in total. Extra files were not added.`
        : null,
    );
    if (accepted.length === 0) return;
    setPickedFiles([
      ...current,
      ...accepted.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
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
      <label className="block text-sm font-medium text-zinc-700">
        Type
        <select
          className={inputClass}
          name="typeId"
          required
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
          disabled={types.length === 0}
        >
          {types.length === 0 ? <option value="">No types yet</option> : null}
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
        {types.length === 0 ? (
          <p className="mt-1 text-xs font-normal text-zinc-500">
            An admin needs to add request types on the Settings page.
          </p>
        ) : request?.type && !types.some((type) => type.name === request.type) ? (
          <p className="mt-1 text-xs font-normal text-zinc-500">
            Previously submitted as {request.type}. Choose the current type.
          </p>
        ) : null}
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Title
        <input
          className={inputClass}
          name="title"
          required
          maxLength={120}
          defaultValue={request?.title}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="block text-sm font-medium text-zinc-700">
          Requester
          <p className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-normal text-zinc-700">
            {request?.requesterName ?? defaultName}
          </p>
        </div>
        <div className="block text-sm font-medium text-zinc-700">
          Department
          <p className="mt-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-normal text-zinc-700">
            {departmentName ?? "Not assigned"}
          </p>
          {!departmentName ? (
            <p className="mt-1 text-xs font-normal text-zinc-500">
              An admin needs to assign your department on the People page.
            </p>
          ) : null}
        </div>
      </div>
      <div className="block text-sm font-medium text-zinc-700">
        <label htmlFor="request-amount">Amount (optional)</label>
        <div className="mt-1 flex gap-2">
          <select
            className="w-28 shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
            name="currency"
            aria-label="Currency"
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
            <option value="JPY">Yen</option>
          </select>
          <input
            id="request-amount"
            className={`${inputClass} mt-0`}
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
      <label className="block text-sm font-medium text-zinc-700">
        Details
        <textarea
          className={`${inputClass} min-h-32`}
          name="details"
          required
          maxLength={4000}
          defaultValue={request?.details}
        />
      </label>
      <div className="block text-sm font-medium text-zinc-700">
        Attachments
        {attachments.length > 0 ? (
          <ul className="mt-2 space-y-2 font-normal">
            {attachments.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2"
              >
                <a
                  href={`/api/attachments/${file.id}`}
                  className="min-w-0 truncate text-zinc-900 underline-offset-2 hover:underline"
                  {...(canPreviewAttachment(file.mimeType)
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {file.originalName}
                  <span className="ml-2 text-xs text-zinc-500">
                    {formatBytes(file.sizeBytes)}
                  </span>
                </a>
                <label className="flex shrink-0 items-center gap-2 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    name="removeAttachmentIds"
                    value={file.id}
                    checked={removed.has(file.id)}
                    onChange={(event) => {
                      setRemoved((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(file.id);
                        else next.delete(file.id);
                        return next;
                      });
                    }}
                  />
                  Remove
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700`}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          onChange={(event) => {
            const incoming = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (incoming.length === 0) return;
            addPickedFiles(incoming);
          }}
        />
        <p className="mt-1 text-xs font-normal text-zinc-500">
          {ATTACHMENT_HINT} You can add files one at a time.
        </p>
        {selected.length > 0 ? (
          <ul className="mt-2 space-y-2 font-normal">
            {selected.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate text-zinc-700">
                  {item.file.name}
                  <span className="ml-2 text-xs text-zinc-500">
                    {formatBytes(item.file.size)}
                    {item.file.size > MAX_FILE_BYTES ? " · over 5 MB" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                  onClick={() => dropPickedFile(item.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {limitWarning ? (
          <p className="mt-1 text-xs font-normal text-rose-700" role="alert">
            {limitWarning}
          </p>
        ) : slotsLeft === 0 && remaining + selected.length >= MAX_FILES ? (
          <p className="mt-1 text-xs font-normal text-zinc-500">
            File limit reached ({MAX_FILES}). Remove a file to add another.
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
        disabled={pending || !departmentName || tooLarge || types.length === 0}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending
          ? "Saving…"
          : request
            ? "Resubmit request"
            : "Submit request"}
      </button>
    </form>
  );
}
