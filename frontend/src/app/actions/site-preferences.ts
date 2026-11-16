"use server";

import { cookies } from "next/headers";
import { parseSitePreferences, SITE_COOKIES } from "../../lib/site-preferences";

export async function saveSitePreferences(form: FormData): Promise<void> {
  const preferences = parseSitePreferences(
    form.get("language"),
    form.get("design"),
  );
  if (!preferences) return;
  const store = await cookies();
  const options = {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax" as const,
  };
  store.set(SITE_COOKIES.language, preferences.language, options);
  store.set(SITE_COOKIES.design, preferences.designPreference, options);
}
