import type { RequestStatus } from "@/lib/db/schema";

const styles: Record<RequestStatus, string> = {
  pending: "border-l-[3px] border-[#e88d14] bg-[#fef3c7] text-[#92400e]",
  changes_requested: "border-l-[3px] border-[#208b9b] bg-[#e0f2fe] text-[#075985]",
  approved: "border-l-[3px] border-[#16a34a] bg-[#dcfce7] text-[#14532d]",
  rejected: "border-l-[3px] border-[#e60012] bg-[#fee2e2] text-[#991b1b]",
  withdrawn: "border-l-[3px] border-[#94a3b8] bg-[#f1f5f9] text-[#475569]",
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
      className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] uppercase ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
