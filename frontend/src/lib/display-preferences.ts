export const DISPLAY_COOKIES = {
  useLocalTime: "ggst-local-time",
  disableRatingColors: "ggst-plain-ratings",
  autoUpdate: "ggst-auto-update",
  timeZone: "ggst-timezone",
} as const;
export type DisplayPreferences = {
  useLocalTime: boolean;
  disableRatingColors: boolean;
  autoUpdate: boolean;
  timeZone: string;
};
export type PreferenceSeed = Partial<DisplayPreferences>;
export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  useLocalTime: false,
  disableRatingColors: false,
  autoUpdate: false,
  timeZone: "UTC",
};

export function validTimeZone(value: string | undefined): string | undefined {
  if (!value || value.length > 100) return undefined;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return value;
  } catch {
    return undefined;
  }
}
export function readPreferenceSeed(
  get: (name: string) => string | undefined,
): PreferenceSeed {
  const boolean = (name: string) => {
    const value = get(name);
    return value === "true" ? true : value === "false" ? false : undefined;
  };
  return {
    useLocalTime: boolean(DISPLAY_COOKIES.useLocalTime),
    disableRatingColors: boolean(DISPLAY_COOKIES.disableRatingColors),
    autoUpdate: boolean(DISPLAY_COOKIES.autoUpdate),
    timeZone: validTimeZone(get(DISPLAY_COOKIES.timeZone)),
  };
}
export function writeDisplayCookie(
  key: keyof DisplayPreferences,
  value: string | boolean,
) {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: synchronous public display preference before SSR refresh.
  document.cookie = `${DISPLAY_COOKIES[key]}=${encodeURIComponent(String(value))}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
export function utcDate(value: string): Date | null {
  const text = value.trim().replace(" ", "T");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(text)) return null;
  const date = new Date(
    /[zZ]$|[+-]\d{2}:?\d{2}$/.test(text) ? text : `${text}Z`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}
export function formatDisplayTime(
  value: string,
  preferences: DisplayPreferences,
): string {
  const date = utcDate(value);
  if (!preferences.useLocalTime || !date) return value;
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: validTimeZone(preferences.timeZone) ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}
