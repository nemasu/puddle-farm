import type { Language } from "../site-preferences";
import { en, type Messages } from "./en";
import { ja } from "./ja";
import { ko } from "./ko";

export function getMessages(language: Language): Messages {
  return language === "ja" ? ja : language === "ko" ? ko : en;
}
