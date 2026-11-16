"use client";

import { useIngestionHealth } from "../../hooks/useIngestionHealth";
import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { useDisplayPreferences } from "../DisplayPreferences";
import styles from "./ladder.module.css";

export function IngestionStatus({
  initialMessage,
  language,
}: {
  initialMessage: string | null;
  language: Language;
}) {
  const preferences = useDisplayPreferences();
  const message = useIngestionHealth(initialMessage, preferences.autoUpdate);
  return message ? (
    <aside role="alert" className={styles.warning}>
      <strong>{getMessages(language).common.warning}</strong> {message}
    </aside>
  ) : null;
}
