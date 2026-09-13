"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { saveRouteSteps } from "@/app/actions/form-route";
import type { RouteStep, StepKind, StepRule } from "@/lib/db/schema";

type PositionOption = {
  id: string;
  name: string;
  holderCount: number;
  active: boolean;
};

type DraftStep = {
  key: string;
  kind: StepKind;
  positionId: string;
  rule: StepRule;
};

const selectClass =
  "h-8 w-full min-w-0 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500";
const rowClass = "flex flex-wrap items-center gap-2 px-3 py-2";
const indexClass = "flex h-8 w-8 shrink-0 items-center justify-center";
const fieldsClass = "flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center";
const typeClass = "sm:w-28 sm:shrink-0";
const positionClass = "sm:min-w-0 sm:flex-1";
const neededClass = "sm:w-40 sm:shrink-0";
const actionsClass = "flex h-8 w-full shrink-0 items-center justify-end gap-1 sm:w-[6.75rem]";

function snapshot(steps: DraftStep[]) {
  return JSON.stringify(
    steps.map((step) => ({
      kind: step.kind,
      positionId: step.positionId,
      rule: step.kind === "review" ? "at_least_1" : step.rule,
    })),
  );
}

function toDraft(steps: RouteStep[]): DraftStep[] {
  return steps.map((step) => ({
    key: step.id,
    kind: step.kind,
    positionId: step.positionId,
    rule: step.rule,
  }));
}

function StepFields({
  positions,
  kind,
  positionId,
  rule,
  onChange,
}: {
  positions: PositionOption[];
  kind: StepKind;
  positionId: string;
  rule: StepRule;
  onChange: (next: { kind: StepKind; positionId: string; rule: StepRule }) => void;
}) {
  return (
    <div className={fieldsClass}>
      <div className={typeClass}>
        <select
          value={kind}
          onChange={(event) => {
            const nextKind = event.target.value as StepKind;
            onChange({
              kind: nextKind,
              positionId,
              rule: nextKind === "review" ? "at_least_1" : rule,
            });
          }}
          className={selectClass}
          aria-label="Step type"
        >
          <option value="review">Review</option>
          <option value="approve">Approve</option>
        </select>
      </div>
      <div className={positionClass}>
        <select
          value={positionId}
          onChange={(event) =>
            onChange({ kind, positionId: event.target.value, rule })
          }
          className={selectClass}
          required
          aria-label="Position"
        >
          {positions
            .filter((position) => position.active || position.id === positionId)
            .map((position) => (
              <option key={position.id} value={position.id}>
                {position.active ? position.name : `${position.name} (inactive)`}
              </option>
            ))}
        </select>
      </div>
      <div className={neededClass}>
        <select
          value={rule}
          onChange={(event) =>
            onChange({ kind, positionId, rule: event.target.value as StepRule })
          }
          className={selectClass}
          disabled={kind === "review"}
          aria-label="Who must act"
        >
          <option value="at_least_1">Any one person</option>
          <option value="everyone">Everyone</option>
        </select>
      </div>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  danger,
  children,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? "border-zinc-200 text-rose-700 hover:bg-rose-50"
          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

function RouteStepListHeader() {
  return (
    <div className={`hidden border-b border-zinc-200 text-xs font-medium text-zinc-500 sm:flex ${rowClass}`}>
      <span className={`${indexClass} text-zinc-400`}>#</span>
      <div className={fieldsClass}>
        <span className={typeClass}>Type</span>
        <span className={positionClass}>Position</span>
        <span className={neededClass}>Needed</span>
      </div>
      <span className={`${actionsClass} text-zinc-400`}> </span>
    </div>
  );
}

export function RouteStepsEditor({
  positions,
  initialSteps,
}: {
  positions: PositionOption[];
  initialSteps: RouteStep[];
}) {
  const assignable = positions.filter((position) => position.active);
  const [steps, setSteps] = useState(() => toDraft(initialSteps));
  const [addKind, setAddKind] = useState<StepKind>("approve");
  const [addPositionId, setAddPositionId] = useState(assignable[0]?.id ?? "");
  const [addRule, setAddRule] = useState<StepRule>("at_least_1");
  const [error, setError] = useState<string>();
  const [pending, startSave] = useTransition();

  const savedSnapshot = snapshot(toDraft(initialSteps));

  useEffect(() => {
    setSteps(toDraft(initialSteps));
    setError(undefined);
  }, [savedSnapshot]);

  const dirty = snapshot(steps) !== savedSnapshot;
  const lastApproveIndex = [...steps]
    .map((step, index) => ({ step, index }))
    .filter((row) => row.step.kind === "approve")
    .at(-1)?.index;

  function updateStep(key: string, next: Omit<DraftStep, "key">) {
    setSteps((current) =>
      current.map((step) => (step.key === key ? { ...step, ...next } : step)),
    );
    setError(undefined);
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const swapWith = index + direction;
      if (swapWith < 0 || swapWith >= current.length) return current;
      const next = [...current];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
    setError(undefined);
  }

  function removeStep(key: string) {
    setSteps((current) => {
      const target = current.find((step) => step.key === key);
      if (
        target?.kind === "approve" &&
        current.filter((step) => step.kind === "approve").length <= 1
      ) {
        setError("Keep at least one approve step.");
        return current;
      }
      return current.filter((step) => step.key !== key);
    });
  }

  function addStep() {
    if (!addPositionId) {
      setError("Add a position before you add a step.");
      return;
    }
    if (steps.length >= 20) {
      setError("Keep the route to 20 steps or fewer.");
      return;
    }

    setSteps((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        kind: addKind,
        positionId: addPositionId,
        rule: addKind === "review" ? "at_least_1" : addRule,
      },
    ]);
    setError(undefined);
  }

  function save() {
    startSave(async () => {
      const result = await saveRouteSteps({
        steps: steps.map((step) => ({
          kind: step.kind,
          positionId: step.positionId,
          rule: step.kind === "review" ? "at_least_1" : step.rule,
        })),
      });
      setError(result?.error);
    });
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-900">Steps</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Requests move down this list. Edit freely, then save the whole route.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <RouteStepListHeader />
        {steps.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-zinc-500">
            Add an approve step to start the route.
          </p>
        ) : (
          <ol>
            {steps.map((step, index) => {
              const emptyPosition =
                (positions.find((position) => position.id === step.positionId)
                  ?.holderCount ?? 0) === 0;

              return (
                <li key={step.key} className="border-b border-zinc-100 last:border-b-0">
                  <div className={rowClass}>
                    <div className={`relative ${indexClass}`}>
                      {index > 0 ? (
                        <span
                          aria-hidden
                          className="absolute bottom-1/2 left-1/2 h-full w-px -translate-x-1/2 bg-zinc-200"
                        />
                      ) : null}
                      {index < steps.length - 1 ? (
                        <span
                          aria-hidden
                          className="absolute top-1/2 left-1/2 h-full w-px -translate-x-1/2 bg-zinc-200"
                        />
                      ) : null}
                      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-medium text-white">
                        {index + 1}
                      </span>
                    </div>

                    <StepFields
                      positions={positions}
                      kind={step.kind}
                      positionId={step.positionId}
                      rule={step.rule}
                      onChange={(next) => updateStep(step.key, next)}
                    />

                    <div className={actionsClass}>
                      <IconButton
                        label="Move up"
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                      >
                        <ChevronUp />
                      </IconButton>
                      <IconButton
                        label="Move down"
                        disabled={index === steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                      >
                        <ChevronDown />
                      </IconButton>
                      <IconButton
                        label="Remove step"
                        danger
                        onClick={() => removeStep(step.key)}
                      >
                        <Trash />
                      </IconButton>
                    </div>
                  </div>

                  {index === lastApproveIndex || emptyPosition ? (
                    <div className="flex flex-wrap gap-x-3 px-3 pb-2 text-xs sm:pl-[3.25rem]">
                      {index === lastApproveIndex ? (
                        <span className="text-zinc-500">Final decision</span>
                      ) : null}
                      {emptyPosition ? (
                        <span className="text-amber-800">
                          No one holds this position yet.
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}

        <div className="border-t border-dashed border-zinc-200 bg-zinc-50/70">
          {assignable.length === 0 ? (
            <p className="px-3 py-3 text-sm text-zinc-500">
              Add an active position before you add a step.
            </p>
          ) : (
            <div className={rowClass}>
              <span aria-hidden className={`${indexClass} text-zinc-400`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs">
                  +
                </span>
              </span>
              <StepFields
                positions={assignable}
                kind={addKind}
                positionId={addPositionId}
                rule={addRule}
                onChange={(next) => {
                  setAddKind(next.kind);
                  setAddPositionId(next.positionId);
                  setAddRule(next.rule);
                }}
              />
              <div className={actionsClass}>
                <button
                  type="button"
                  onClick={addStep}
                  className="h-8 w-full rounded-md border border-zinc-300 bg-white text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2.5">
          <p className="text-xs text-zinc-500" role="status">
            {error ? (
              <span className="text-rose-700">{error}</span>
            ) : dirty ? (
              "You have unsaved changes."
            ) : (
              "No unsaved changes."
            )}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="h-8 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save route"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronUp() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M4 10l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Trash() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden>
      <path
        d="M3.5 4.5h9M6 4.5V3.5h4v1M5 4.5l.4 8h5.2l.4-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
