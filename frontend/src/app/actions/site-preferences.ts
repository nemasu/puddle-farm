"use server";

import { cookies } from "next/headers";
import {
  parseLadderTheme,
  parseSitePreferences,
  SITE_COOKIES,
} from "../../lib/site-preferences";
import { THEME_COOKIE } from "../../lib/theme-preference";
import { isCharacterName } from "../../utils/themes";

const preferenceCookieOptions = {
  path: "/",
  maxAge: 31_536_000,
  sameSite: "lax" as const,
};

export async function saveSitePreferences(form: FormData): Promise<void> {
  const preferences = parseSitePreferences(
    form.get("language"),
    form.get("design"),
  );
  if (!preferences) return;
  const store = await cookies();
  store.set(
    SITE_COOKIES.language,
    preferences.language,
    preferenceCookieOptions,
  );
  store.set(
    SITE_COOKIES.design,
    preferences.designPreference,
    preferenceCookieOptions,
  );
}

export async function saveCharacterTheme(form: FormData): Promise<void> {
  const theme = form.get("theme");
  if (typeof theme !== "string" || !isCharacterName(theme)) return;
  const store = await cookies();
  store.set(THEME_COOKIE, theme, preferenceCookieOptions);
}

export async function saveLadderTheme(form: FormData): Promise<void> {
  const theme = parseLadderTheme(form.get("ladderTheme"));
  if (!theme) return;
  const store = await cookies();
  store.set(SITE_COOKIES.ladderTheme, theme, preferenceCookieOptions);
}
