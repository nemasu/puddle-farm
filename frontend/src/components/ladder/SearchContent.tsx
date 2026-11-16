import { getMessages } from "../../lib/i18n";
import { getSearchResults } from "../../lib/server/search";
import type { Language } from "../../lib/site-preferences";
import styles from "./ladder.module.css";
import { LadderRankingTable } from "./RankingTable";
import { SearchForm } from "./SearchForm";

export async function LadderSearchContent({
  query,
  exact,
  language,
}: {
  query: string;
  exact: boolean;
  language: Language;
}) {
  const messages = getMessages(language).ladder;
  let players: Awaited<ReturnType<typeof getSearchResults>> | null = null;
  try {
    players = await getSearchResults(query, exact);
  } catch (error) {
    console.error("Could not load search results:", error);
  }
  return (
    <section className={styles.content} aria-labelledby="search-title">
      <div className={styles.sectionHeading}>
        <p>{messages.searchTitle}</p>
        <h1 id="search-title">
          {messages.searchHeading} <span>{messages.searchAccent}</span>
        </h1>
      </div>
      <SearchForm query={query} exact={exact} language={language} />
      {players === null ? (
        <p className={styles.error} role="alert">
          {messages.searchError}
        </p>
      ) : !query ? (
        <p className={styles.note}>{messages.searchPrompt}</p>
      ) : (
        <>
          <LadderRankingTable
            rows={players}
            language={language}
            label={messages.searchTable}
            emptyMessage={messages.searchEmpty}
            ranked={false}
          />
          <p className={styles.note}>
            {messages.count}: {players.length}
          </p>
        </>
      )}
    </section>
  );
}
