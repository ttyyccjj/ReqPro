import { cookies } from "next/headers";
import { createTranslator, type Translator } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/locale";

export async function getLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export async function getTranslator(): Promise<Translator> {
  return createTranslator(await getLocale());
}
