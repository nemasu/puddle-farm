import { getMessages } from "../../lib/i18n";
import { characterLabel } from "../../lib/ladder-characters";
import { filterLegend } from "../../lib/ladder-ranking";
import type { PageSearchParams } from "../../lib/pagination";
import { getLegendRanking } from "../../lib/server/rankings";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import { UpdateCountdown } from "../classic/UpdateCountdown";
import styles from "./ladder.module.css";
import { RankingHero } from "./RankingHero";
import { LadderRankingTable } from "./RankingTable";

export async function LadderLegendContent({
  language,
  params,
}: {
  language: Language;
  params: PageSearchParams;
}) {
  const messages = getMessages(language).ladder;
  let result: Awaited<ReturnType<typeof getLegendRanking>> | null = null;
  try {
    result = await getLegendRanking();
  } catch (error) {
    console.error("Could not load the Legend leaderboard:", error);
  }
  const entries = result?.ranks ?? [];
  const filtered = filterLegend(entries, params);
  const characters = [
    ...new Map(
      entries.map((entry) => [entry.char_short, entry.char_long]),
    ).entries(),
  ];
  return (
    <>
      <RankingHero
        entries={entries}
        lastUpdateMs={result?.lastUpdateMs ?? null}
        language={language}
        subtitle={messages.subtitle}
        entryLabel={messages.legendEntries}
        available={result !== null}
      />
      <section className={styles.content} aria-labelledby="legend-title">
        <div className={styles.sectionHeading}>
          <p>{messages.section}</p>
          <h2 id="legend-title">
            {messages.heading} <span>{messages.headingAccent}</span>
          </h2>
        </div>
        <form action="/" method="get" className={styles.controls}>
          <div className={styles.searchField}>
            <label htmlFor="legend-query">{messages.search}</label>
            <input
              id="legend-query"
              className={styles.search}
              type="search"
              name="q"
              defaultValue={filtered.query}
              placeholder={messages.search}
              autoComplete="off"
            />
          </div>
          <div className={styles.filterRow}>
            <div className={styles.characterField}>
              <label htmlFor="legend-character">{messages.character}</label>
              <select
                id="legend-character"
                name="character"
                defaultValue={filtered.character}
              >
                <option value="">{messages.allCharacters}</option>
                {characters.map(([short, name]) => (
                  <option key={short} value={short}>
                    {characterLabel(short, name, language)}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">{messages.apply}</button>
            <Link className={styles.secondaryButton} href="/">
              {messages.clear}
            </Link>
            <Link className={styles.allRankings} href="/top_global">
              {messages.allRankings} →
            </Link>
          </div>
        </form>
        {!result ? (
          <p className={styles.error} role="alert">
            {messages.error}
          </p>
        ) : (
          <LadderRankingTable
            rows={filtered.ranks}
            language={language}
            label={messages.leaderboard}
            emptyMessage={entries.length ? messages.noMatches : messages.empty}
            legend
          />
        )}
        <p className={styles.note}>
          {messages.count}: {filtered.ranks.length} · {messages.filterNote}
        </p>
        {result?.lastUpdateMs != null && (
          <div className={styles.note}>
            <UpdateCountdown
              updateAt={result.lastUpdateMs + 3_600_000}
              renderedAt={Date.now()}
              label={messages.nextUpdate}
              updating={messages.updating}
            />
          </div>
        )}
      </section>
    </>
  );
}
