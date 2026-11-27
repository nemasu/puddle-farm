import type { ReactNode } from "react";
import { getMessages } from "../../lib/i18n";
import type { Design, Language } from "../../lib/site-preferences";
import shared from "./ladder.module.css";
import styles from "./settings.module.css";
export function TermsPresentation({
  children,
  language,
  design,
}: {
  children: ReactNode;
  language: Language;
  design: Design;
}) {
  if (design === "classic") return children;
  const messages = getMessages(language).terms;
  return (
    <section className={`${shared.content} ${styles.policy}`}>
      <div className={shared.sectionHeading}>
        <p>{messages.title}</p>
        <h1>
          {messages.heading} <span>{messages.accent}</span>
        </h1>
      </div>
      <div className={styles.policyPaper}>{children}</div>
    </section>
  );
}
