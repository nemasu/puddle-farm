import type { StatsResponse } from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import type { RankingEntry } from "../../lib/rankings";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import styles from "./ladder.module.css";

export function RankingHero({
  entries,
  lastUpdateMs,
  language,
  subtitle,
  entryLabel,
  available = true,
  overview,
}: {
  entries: RankingEntry[];
  lastUpdateMs: number | null;
  language: Language;
  subtitle: string;
  entryLabel: string;
  available?: boolean;
  overview?: StatsResponse | null;
}) {
  const messages = getMessages(language).ladder;
  const characters = new Set(entries.map((entry) => entry.char_short));
  const highest = entries.reduce<RankingEntry | null>(
    (best, entry) => (!best || entry.rating > best.rating ? entry : best),
    null,
  );
  const updated =
    lastUpdateMs != null ? new Date(lastUpdateMs).toISOString() : null;
  return (
    <section className={styles.hero} aria-labelledby="ladder-title">
      <div className={styles.redSlash} aria-hidden="true" />
      <div className={styles.cyanSlash} aria-hidden="true" />
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{messages.eyebrow}</p>
          <h1 id="ladder-title">
            <span>S</span>TRIVE
            <br />
            <span>L</span>ADDER
          </h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <ul className={styles.stats}>
          {overview !== undefined ? (
            [
              [messages.totalPlayers, overview?.total_players],
              [messages.monthPlayers, overview?.one_month_players],
              [messages.dayGames, overview?.one_day_games],
              [messages.totalGames, overview?.total_games],
            ].map(([label, value]) => (
              <li key={label}>
                <b>
                  {typeof value === "number"
                    ? value.toLocaleString(language)
                    : "—"}
                </b>
                {label}
              </li>
            ))
          ) : (
            <>
              <li>
                <b>
                  {available ? entries.length.toLocaleString(language) : "—"}
                </b>
                {entryLabel}
              </li>
              <li>
                <b>
                  {available ? characters.size.toLocaleString(language) : "—"}
                </b>
                {messages.charactersRepresented}
              </li>
              <li>
                <b>{highest ? Utils.displayRating(highest.rating) : "—"}</b>
                {messages.highestRating}
              </li>
              <li>
                <b className={styles.timestamp}>
                  {updated ? (
                    <time dateTime={updated}>
                      {updated.slice(0, 10)}
                      <br />
                      {updated.slice(11, 16)}
                    </time>
                  ) : (
                    "—"
                  )}
                </b>
                {messages.lastUpdated}
              </li>
            </>
          )}
        </ul>
      </div>
    </section>
  );
}
