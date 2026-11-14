export const THEME_COOKIE = "ggst-theme";

export function writeThemeCookie(theme: string): void {
  if (typeof document === "undefined") return;
  // biome-ignore lint/suspicious/noDocumentCookie: synchronous preference update before refreshing SSR content.
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
