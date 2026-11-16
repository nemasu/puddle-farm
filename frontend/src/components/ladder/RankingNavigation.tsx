import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import styles from "./ladder.module.css";

export function RankingNavigation({
  language,
  current,
}: {
  language: Language;
  current: "global" | "character" | "search";
}) {
  const messages = getMessages(language).ladder;
  return (
    <nav className={styles.routeTabs} aria-label={messages.rankings}>
      <Link href="/">{messages.legendTab}</Link>
      <Link
        href="/top_global"
        aria-current={current === "global" ? "page" : undefined}
      >
        {messages.globalTab}
      </Link>
      <Link
        href="/search"
        aria-current={current === "search" ? "page" : undefined}
      >
        {messages.searchTab}
      </Link>
    </nav>
  );
}
