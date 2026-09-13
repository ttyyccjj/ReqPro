"use client";

import { useLocale } from "@/components/locale-provider";
import { formatDate } from "@/lib/format";

export function LocalDate({ value }: { value: Date | number }) {
  const { locale } = useLocale();
  const date = value instanceof Date ? value : new Date(value);
  return (
    <time dateTime={date.toISOString()} suppressHydrationWarning>
      {formatDate(date, locale)}
    </time>
  );
}
