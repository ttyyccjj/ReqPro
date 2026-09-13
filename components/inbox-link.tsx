"use client";

import Link from "next/link";
import { useInboxLive } from "@/components/inbox-live";

export function InboxLink() {
  const { count } = useInboxLive();

  return (
    <Link
      href="/approvals"
      className="relative pr-3 hover:text-zinc-900"
      aria-label={count > 0 ? `Inbox, ${count} waiting` : "Inbox"}
    >
      Inbox
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 right-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
