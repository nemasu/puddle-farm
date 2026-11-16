import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import { getMessages } from "../i18n";
import {
  activeDesign,
  readSitePreferences,
  resolveDesign,
} from "../site-preferences";

export const getRequestPresentation = cache(async () => {
  const store = await cookies();
  const preferences = readSitePreferences((name) => store.get(name)?.value);
  return {
    ...preferences,
    preferredDesign: resolveDesign(preferences),
    design: activeDesign(preferences),
    messages: getMessages(preferences.language),
  };
});
