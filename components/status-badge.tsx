import type { RequestStatus } from "@/lib/db/schema";

const styles: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  changes_requested: "bg-sky-100 text-sky-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-rose-100 text-rose-900",
  withdrawn: "bg-zinc-200 text-zinc-700",
};

const labels: Record<RequestStatus, string> = {
  pending: "Pending",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
