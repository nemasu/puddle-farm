import type { Design, Language } from "../site-preferences";
import { getMessages } from ".";
import type { Messages } from "./en";

export function getClassicMessages(language: Language) {
  return getMessages(language === "ja" ? "ja" : "en");
}

// Keep published Classic English copy while selecting translated Ladder/Japanese copy.
export function getPageCopy<T>(
  presentation: { design: Design; language: Language },
  classicCopy: T,
  translatedCopy: (messages: Messages) => T,
): T {
  return presentation.design === "ladder" || presentation.language === "ja"
    ? translatedCopy(getMessages(presentation.language))
    : classicCopy;
}
