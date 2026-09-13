"use client";

import { formatDate } from "@/lib/format";

export function LocalDate({ value }: { value: Date | number }) {
  const date = value instanceof Date ? value : new Date(value);
  return (
    <time dateTime={date.toISOString()} suppressHydrationWarning>
      {formatDate(date)}
    </time>
  );
}
