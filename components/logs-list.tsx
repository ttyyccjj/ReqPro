"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadMoreLogs } from "@/app/actions/logs";
import { useLocale } from "@/components/locale-provider";
import { formatDate } from "@/lib/format";
import { translateLogCategory, translateLogSummary } from "@/lib/log-i18n";
import type { SystemLogItem } from "@/lib/system-log";

const categoryClass: Record<SystemLogItem["category"], string> = {
  Request: "border-l-[3px] border-[#208b9b] bg-[#e0f2fe] text-[#075985]",
  People: "border-l-[3px] border-[#3f5268] bg-[#e7eeff] text-[#111c2d]",
  Settings: "border-l-[3px] border-[#e88d14] bg-[#fef3c7] text-[#92400e]",
  Account: "border-l-[3px] border-[#94a3b8] bg-[#f1f5f9] text-[#475569]",
};

export function LogsList({
  initialItems,
  initialCursor,
}: {
  initialItems: SystemLogItem[];
  initialCursor: string | null;
}) {
  const { locale, t } = useLocale();
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
      <p className="panel-empty">
        {t("logs.empty")}
      </p>
    );
  }

  return (
    <ul className="card mt-6 divide-y divide-line overflow-hidden">
      {items.map((item) => (
        <li key={item.id} className="px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm text-ink">{translateLogSummary(t, locale, item)}</p>
            <span
              className={`inline-flex rounded-sm px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] uppercase ${categoryClass[item.category]}`}
            >
              {translateLogCategory(t, item.category)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {item.actorName}
            <span className="text-line-strong"> · </span>
            {formatDate(item.createdAt, locale)}
            {item.requestId ? (
              <>
                <span className="text-line-strong"> · </span>
                <Link
                  href={`/requests/${item.requestId}`}
                  className="font-mono text-muted hover:text-ink hover:underline"
                >
                  {item.requestNumber ?? t("logs.openRequest")}
                </Link>
              </>
            ) : null}
          </p>
        </li>
      ))}
      {cursor ? (
        <li
          ref={sentinelRef}
          className="px-4 py-3 text-center text-xs text-muted"
        >
          {pending ? t("logs.loadingMore") : t("logs.scrollMore")}
        </li>
      ) : (
        <li className="px-4 py-3 text-center text-xs text-muted">
          {t("logs.end")}
        </li>
      )}
    </ul>
  );
}
