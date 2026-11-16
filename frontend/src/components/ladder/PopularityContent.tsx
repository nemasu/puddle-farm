import type { CSSProperties } from "react";
import type { PopularityResult } from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import { characterLabel, getCharacterArt } from "../../lib/ladder-characters";
import { firstParam, type PageSearchParams } from "../../lib/pagination";
import {
  parsePopularitySort,
  popularitySortHref,
  sortPopularityData,
} from "../../lib/popularity";
import { getCharacters } from "../../lib/server/characters";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import { PlayerDateTime } from "../classic/PlayerFormatting";
import shared from "./ladder.module.css";
import styles from "./popularity.module.css";
import { StatisticsNavigation } from "./StatisticsNavigation";

export async function LadderPopularityContent({
  data,
  query,
  language,
}: {
  data: PopularityResult | null;
  query: PageSearchParams;
  language: Language;
}) {
  const messages = getMessages(language).popularity;
  const characters = data ? await getCharacters().catch(() => ({})) : {};
  const characterCodes = new Map(
    Object.entries(characters).map(([short, name]) => [name, short]),
  );
  const picks = [...(data?.per_character ?? [])].sort(
    (a, b) => b.value - a.value,
  );
  const maximum = Math.max(0, ...picks.map((row) => row.value));
  return (
    <section className={shared.content} aria-labelledby="popularity-title">
      <StatisticsNavigation language={language} current="popularity" />
      <div className={shared.sectionHeading}>
        <p>
          {messages.title} / {messages.period}
        </p>
        <h1 id="popularity-title">
          {messages.heading} <span>{messages.accent}</span>
        </h1>
      </div>
      {!data ? (
        <p className={shared.error} role="alert">
          {messages.error}
        </p>
      ) : (
        <>
          <section
            className={styles.overview}
            aria-label={messages.perCharacter}
            data-pick-overview
          >
            <p className={styles.explanation}>{messages.barExplanation}</p>
            <div className={styles.pickBars}>
              {picks.map((row) => {
                const short = characterCodes.get(row.name);
                const name = short
                  ? characterLabel(short, row.name, language)
                  : row.name;
                const share =
                  data.per_character_total > 0
                    ? (row.value / (data.per_character_total * 2)) * 100
                    : 0;
                return (
                  <div
                    className={styles.pickRow}
                    key={row.name}
                    data-pick-character={row.name}
                  >
                    <span className={styles.pickName}>
                      {short ? (
                        <Link href={`/top/${encodeURIComponent(short)}`}>
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </span>
                    <span className={styles.pickTrack} aria-hidden="true">
                      <span
                        style={{
                          width: `${maximum > 0 ? (row.value / maximum) * 100 : 0}%`,
                        }}
                      />
                    </span>
                    <b>{share.toFixed(2)}%</b>
                  </div>
                );
              })}
            </div>
            {!picks.length && <p className={shared.note}>{messages.empty}</p>}
            <a className={styles.detailsLink} href="#popularity-details">
              {messages.viewDetails} ↓
            </a>
          </section>
          <h2 className={styles.detailsTitle} id="popularity-details">
            {messages.details}
          </h2>
          <div className={styles.columns}>
            {(["player", "character"] as const).map((kind) => {
              const state = parsePopularitySort(
                firstParam(query[`${kind}Sort`]),
              );
              const entries =
                kind === "player" ? data.per_player : data.per_character;
              const total =
                kind === "player"
                  ? data.per_player_total
                  : data.per_character_total * 2;
              const title =
                kind === "player" ? messages.perPlayer : messages.perCharacter;
              return (
                <section
                  key={kind}
                  className={styles.panel}
                  aria-labelledby={`${kind}-popularity-title`}
                  data-popularity={kind}
                >
                  <h2 id={`${kind}-popularity-title`}>{title}</h2>
                  <p className={styles.explanation}>
                    {kind === "player"
                      ? messages.playerExplanation
                      : messages.characterExplanation}
                  </p>
                  <p className={styles.sample}>
                    {kind === "player"
                      ? messages.samplePlayers
                      : messages.sampleSelections}
                    : <strong>{total.toLocaleString(language)}</strong>
                    {kind === "character" && (
                      <>
                        {" "}
                        · {messages.sampleGames}:{" "}
                        <strong>
                          {data.per_character_total.toLocaleString(language)}
                        </strong>
                      </>
                    )}
                  </p>
                  <div className={styles.tableWrap}>
                    <table aria-label={title}>
                      <thead>
                        <tr>
                          <th
                            scope="col"
                            aria-sort={
                              state?.column === "character" ? "other" : "none"
                            }
                          >
                            <Link
                              href={popularitySortHref(
                                query,
                                kind,
                                "character",
                              )}
                              scroll={false}
                              title={
                                state?.column === "character"
                                  ? messages.restore
                                  : messages.reverse
                              }
                            >
                              {messages.character}{" "}
                              <span aria-hidden="true">
                                {state?.column === "character" ? "↓" : "↕"}
                              </span>
                            </Link>
                          </th>
                          <th
                            scope="col"
                            aria-sort={
                              state?.column === "popularity"
                                ? state.direction === "asc"
                                  ? "ascending"
                                  : "descending"
                                : "none"
                            }
                          >
                            <Link
                              href={popularitySortHref(
                                query,
                                kind,
                                "popularity",
                              )}
                              scroll={false}
                              title={messages.sortShare}
                            >
                              {messages.share}{" "}
                              <span aria-hidden="true">
                                {state?.column === "popularity"
                                  ? state.direction === "asc"
                                    ? "↑"
                                    : "↓"
                                  : "↕"}
                              </span>
                            </Link>
                          </th>
                          <th scope="col">
                            {kind === "player"
                              ? messages.players
                              : messages.selections}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortPopularityData(entries, state).map((row) => {
                          const short = characterCodes.get(row.name);
                          const art = short
                            ? getCharacterArt(short)
                            : undefined;
                          const name = short
                            ? characterLabel(short, row.name, language)
                            : row.name;
                          const share =
                            total > 0 ? (row.value / total) * 100 : 0;
                          const label = (
                            <>
                              {art && (
                                // biome-ignore lint/performance/noImgElement: decorative local character art with fixed dimensions.
                                <img
                                  src={`/ladder/characters/${art.art}.webp`}
                                  width={44}
                                  height={44}
                                  loading="lazy"
                                  alt=""
                                />
                              )}
                              <span>{name}</span>
                            </>
                          );
                          return (
                            <tr key={row.name} data-character={row.name}>
                              <th scope="row">
                                {short ? (
                                  <Link
                                    className={styles.character}
                                    href={`/top/${encodeURIComponent(short)}`}
                                    title={messages.ranking}
                                  >
                                    {label}
                                  </Link>
                                ) : (
                                  <span className={styles.character}>
                                    {label}
                                  </span>
                                )}
                              </th>
                              <td>
                                <span className={styles.percent}>
                                  {share.toFixed(2)}%
                                </span>
                                <span
                                  className={styles.track}
                                  aria-hidden="true"
                                >
                                  <span
                                    style={
                                      {
                                        "--share": `${Math.min(100, Math.max(0, share))}%`,
                                      } as CSSProperties
                                    }
                                  />
                                </span>
                              </td>
                              <td>{row.value.toLocaleString(language)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!entries.length && (
                    <p className={shared.note}>{messages.empty}</p>
                  )}
                  <p className={shared.note}>{messages.defaultOrder}</p>
                </section>
              );
            })}
          </div>
          <p className={shared.note}>{messages.updated}</p>
          <p className={shared.note}>
            {messages.checked}: <PlayerDateTime value={data.last_update} />
          </p>
        </>
      )}
    </section>
  );
}
