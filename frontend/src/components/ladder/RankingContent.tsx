import { redirect } from "next/navigation";
import type { StatsResponse } from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import type { Pagination } from "../../lib/pagination";
import { computeShowNext } from "../../lib/rankings";
import { ApiError, readJson } from "../../lib/server/api";
import { getRanking } from "../../lib/server/rankings";
import type { Language } from "../../lib/site-preferences";
import { ONE_DAY_MS } from "../../utils/time";
import { UpdateCountdown } from "../classic/UpdateCountdown";
import { CharacterSelector } from "./CharacterSelector";
import styles from "./ladder.module.css";
import { RankingHero } from "./RankingHero";
import { LadderPagination } from "./RankingPagination";
import { LadderRankingTable } from "./RankingTable";

export async function LadderRankingContent({
  pagination,
  character,
  name,
  language,
}: {
  pagination: Pagination;
  character?: string;
  name?: string;
  language: Language;
}) {
  const messages = getMessages(language).ladder;
  const overview = character
    ? undefined
    : readJson<StatsResponse>("/stats").catch(() => null);
  let result: Awaited<ReturnType<typeof getRanking>> | null = null;
  try {
    result = await getRanking(pagination, character);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) redirect("/");
    console.error("Could not load the leaderboard:", error);
  }
  const base = character
    ? `/top/${encodeURIComponent(character)}`
    : "/top_global";
  const title = character
    ? `${name ?? character} ${messages.characterRankings}`
    : messages.globalTitle;
  const paginationProps = {
    base,
    pagination,
    language,
    showNext: result
      ? computeShowNext(result.ranks.length, pagination.count)
      : false,
  };
  return (
    <>
      <RankingHero
        entries={result?.ranks ?? []}
        lastUpdateMs={result?.lastUpdateMs ?? null}
        language={language}
        subtitle={title}
        entryLabel={messages.pageEntries}
        available={result !== null}
        overview={await overview}
      />
      <section className={styles.content} aria-labelledby="ranking-title">
        <div className={styles.sectionHeading}>
          <p>{messages.section}</p>
          <h2 id="ranking-title" aria-label={title}>
            {character ? (
              title
            ) : (
              <>
                {messages.globalHeading} <span>{messages.globalAccent}</span>
              </>
            )}
          </h2>
        </div>
        <CharacterSelector language={language} character={character} />
        {!result ? (
          <p className={styles.error} role="alert">
            {messages.error}
          </p>
        ) : (
          <>
            {result.lastUpdateMs != null && (
              <div className={styles.note}>
                <UpdateCountdown
                  includeHours
                  updateAt={result.lastUpdateMs + ONE_DAY_MS}
                  renderedAt={Date.now()}
                  label={messages.nextUpdate}
                  updating={messages.updating}
                />
              </div>
            )}
            <LadderPagination {...paginationProps} position="top" />
            <LadderRankingTable
              rows={result.ranks}
              language={language}
              label={character ? messages.characterTable : messages.globalTable}
              emptyMessage={messages.emptyRanking}
            />
            <LadderPagination {...paginationProps} position="bottom" />
          </>
        )}
        <p className={styles.note}>{messages.rankingNote}</p>
      </section>
    </>
  );
}
