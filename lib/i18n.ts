import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

type Messages = (typeof messages)["en"];

type NestedKey<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: NestedKey<
        T[K],
        Prefix extends "" ? K : `${Prefix}.${K}`
      >;
    }[keyof T & string]
  : Prefix;

export type MessageKey = NestedKey<Messages>;
export type MessageVars = Record<string, string | number>;
export type Translator = (key: MessageKey, vars?: MessageVars) => string;

function lookup(tree: unknown, key: string): string | undefined {
  let current: unknown = tree;
  for (const part of key.split(".")) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

const messageKeys = new Set<string>();

function collectKeys(tree: unknown, prefix = "") {
  if (!tree || typeof tree !== "object") return;
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") messageKeys.add(path);
    else collectKeys(value, path);
  }
}

collectKeys(messages.en);

export function isMessageKey(value: string | undefined | null): value is MessageKey {
  return Boolean(value && messageKeys.has(value));
}

function interpolate(template: string, vars?: MessageVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value == null ? match : String(value);
  });
}

export function createTranslator(locale: Locale): Translator {
  const catalog = messages[isLocale(locale) ? locale : DEFAULT_LOCALE];
  const fallback = messages.en;
  return (key, vars) => {
    const text = lookup(catalog, key) ?? lookup(fallback, key) ?? key;
    return interpolate(text, vars);
  };
}

export function zodMessage(
  t: Translator,
  issues: { message: string }[],
  fallback: MessageKey,
) {
  const raw = issues[0]?.message;
  return isMessageKey(raw) ? t(raw) : t(fallback);
}

export function translateThrown(
  t: Translator,
  error: unknown,
  fallback: MessageKey,
) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: string }).message);
    const params = "params" in error ? (error as { params?: MessageVars }).params : undefined;
    if (isMessageKey(message)) return t(message, params);
  }
  return t(fallback);
}

export function formatQuotedTitle(locale: Locale, title: string) {
  return locale === "ja" ? `「${title}」` : `"${title}"`;
}

export function formatRequestRef(
  locale: Locale,
  title: string,
  number?: string | null,
) {
  const quoted = formatQuotedTitle(locale, title);
  return number ? `${number} ${quoted}` : quoted;
}

export function localeTag(locale: Locale) {
  return locale === "ja" ? "ja" : "en";
}
