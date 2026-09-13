"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadMoreLogs } from "@/app/actions/logs";
import { formatDate } from "@/lib/format";
import type { SystemLogItem } from "@/lib/system-log";

const categoryClass: Record<SystemLogItem["category"], string> = {
  Request: "bg-sky-50 text-sky-800",
  People: "bg-violet-50 text-violet-800",
  Settings: "bg-amber-50 text-amber-900",
  Account: "bg-zinc-100 text-zinc-700",
};

export function LogsList({
  initialItems,
  initialCursor,
}: {
  initialItems: SystemLogItem[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, start] = useTransition();
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
  }, [initialItems, initialCursor]);

  useEffect(() => {
    if (!cursor) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingRef.current || !cursor) {
          return;
        }
        loadingRef.current = true;
        start(async () => {
          try {
            const page = await loadMoreLogs(cursor);
            setItems((current) => {
              const seen = new Set(current.map((item) => item.id));
              return [
                ...current,
                ...page.items.filter((item) => !seen.has(item.id)),
              ];
            });
            setCursor(page.nextCursor);
          } finally {
            loadingRef.current = false;
          }
        });
      },
      { rootMargin: "240px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [cursor]);

  if (items.length === 0) {
    return (
      <p className="mt-8 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
        Nothing has been logged yet.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-zinc-100 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm text-zinc-900">{item.summary}</p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryClass[item.category]}`}
            >
              {item.category}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {item.actorName}
            <span className="text-zinc-300"> · </span>
            {formatDate(item.createdAt)}
            {item.requestId ? (
              <>
                <span className="text-zinc-300"> · </span>
                <Link
                  href={`/requests/${item.requestId}`}
                  className="font-mono text-zinc-600 hover:text-zinc-900 hover:underline"
                >
                  {item.requestNumber ?? "Open request"}
                </Link>
              </>
            ) : null}
          </p>
        </li>
      ))}
      {cursor ? (
        <li
          ref={sentinelRef}
          className="px-4 py-3 text-center text-xs text-zinc-500"
        >
          {pending ? "Loading more…" : "Scroll to load more"}
        </li>
      ) : (
        <li className="px-4 py-3 text-center text-xs text-zinc-400">
          End of logs
        </li>
      )}
    </ul>
  );
}
