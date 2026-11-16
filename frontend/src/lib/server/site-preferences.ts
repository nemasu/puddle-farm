import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getMessages } from "../i18n";
import {
  activeDesign,
  parseDesignPreference,
  readSitePreferences,
  resolveDesign,
  SITE_COOKIES,
} from "../site-preferences";

export const getRequestPresentation = cache(async () => {
  const store = await cookies();
  const requestHeaders = await headers();
  const preferences = readSitePreferences(
    (name) => store.get(name)?.value,
    requestHeaders.get("accept-language"),
  );
  return {
    ...preferences,
    hasDesignPreference:
      parseDesignPreference(store.get(SITE_COOKIES.design)?.value) !== null,
    preferredDesign: resolveDesign(preferences),
    design: activeDesign(preferences),
    messages: getMessages(preferences.language),
  };
});
