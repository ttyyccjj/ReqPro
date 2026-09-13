"use client";

import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/locale";

const options: { value: Locale; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "ja", label: "日本語" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      role="group"
      aria-label={t("brand.language")}
      className="inline-flex overflow-hidden rounded-sm border border-line"
    >
      {options.map((option) => {
        const active = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(option.value)}
            className={`px-2 py-1 text-[11px] font-semibold ${
              active
                ? "bg-slate text-white"
                : "bg-panel text-muted hover:bg-wash hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
