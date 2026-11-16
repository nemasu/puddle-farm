import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import styles from "./ladder.module.css";

export function StatisticsNavigation({
  language,
  current,
}: {
  language: Language;
  current: "stats" | "popularity" | "matchup" | "distribution";
}) {
  const messages = getMessages(language).stats;
  return (
    <nav className={styles.routeTabs} aria-label={messages.title}>
      {(
        [
          ["stats", messages.activity],
          ["popularity", messages.popularity],
          ["matchup", messages.matchup],
          ["distribution", messages.distribution],
        ] as const
      ).map(([path, label]) => (
        <Link
          key={path}
          href={`/${path}`}
          aria-current={current === path ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
