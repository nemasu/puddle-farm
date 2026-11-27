import type { ReactNode } from "react";
import { getMessages } from "../../lib/i18n";
import type { Design, Language } from "../../lib/site-preferences";
import shared from "./ladder.module.css";
import styles from "./settings.module.css";
export function SettingsPresentation({
  children,
  language,
  design,
}: {
  children: ReactNode;
  language: Language;
  design: Design;
}) {
  if (design === "classic") return children;
  const messages = getMessages(language).settings;
  return (
    <section
      className={`${shared.content} ${styles.settings}`}
      aria-label={messages.title}
    >
      {children}
    </section>
  );
}
