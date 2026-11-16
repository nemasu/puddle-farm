import type {
  MatchupCharResponse,
  MatchupResponse,
} from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import { characterLabel } from "../../lib/ladder-characters";
import {
  type MatrixKind,
  matchupRate,
  matrixColumns,
  matrixSort,
  matrixSortHref,
  sortMatrixRows,
} from "../../lib/matchup-matrix";
import { getCharacterWinRates } from "../../lib/matchups";
import type { PageSearchParams } from "../../lib/pagination";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import { PlayerDateTime } from "../classic/PlayerFormatting";
import shared from "./ladder.module.css";
import styles from "./matchup.module.css";
import { StatisticsNavigation } from "./StatisticsNavigation";

function rateClass(rate: number | null) {
  return rate === null
    ? styles.missing
    : rate > 55
      ? styles.favorable
      : rate < 45
        ? styles.unfavorable
        : styles.neutral;
}

function Matrix({
  rows,
  kind,
  query,
  language,
  title,
}: {
  rows: MatchupCharResponse[];
  kind: MatrixKind;
  query: PageSearchParams;
  language: Language;
  title: string;
}) {
  const messages = getMessages(language).matchup;
  const columns = matrixColumns(rows);
  const sort = matrixSort(query, kind, columns);
  const id = `matchup-${kind}-matrix`;
  const highlight = columns
    .map(
      (_, index) =>
        `#${id}:has(td:nth-child(${index + 2}):hover) thead th:nth-child(${index + 2}){background:#515151}`,
    )
    .join("\n");
  return (
    <>
      <p className={shared.note}>{messages.scroll}</p>
      <section
        className={styles.scroll}
        aria-label={`${title} · ${messages.matrix}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard access to the horizontal scroll region.
        tabIndex={0}
      >
        <style>{highlight}</style>
        <table
          className={styles.matrix}
          id={id}
          aria-label={`${title} · ${messages.matrix}`}
        >
          <thead>
            <tr>
              <th
                scope="col"
                aria-sort={
                  sort?.column === "character"
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                }
              >
                <Link
                  href={matrixSortHref(query, kind, "character", sort)}
                  scroll={false}
                  title={messages.sortCharacter}
                >
                  {messages.character}{" "}
                  <span aria-hidden="true">
                    {sort?.column === "character"
                      ? sort.direction === "asc"
                        ? "↑"
                        : "↓"
                      : "↕"}
                  </span>
                </Link>
              </th>
              {columns.map((column) => (
                <th
                  key={column.char_short}
                  scope="col"
                  aria-sort={
                    sort?.column === column.char_short
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <Link
                    href={matrixSortHref(query, kind, column.char_short, sort)}
                    scroll={false}
                    title={`${messages.sortOpponent} ${characterLabel(column.char_short, column.char_name, language)}`}
                  >
                    {column.char_short}
                    <span className={styles.opponentName}>
                      {characterLabel(
                        column.char_short,
                        column.char_name,
                        language,
                      )}
                    </span>
                    <span aria-hidden="true">
                      {sort?.column === column.char_short
                        ? sort.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortMatrixRows(rows, sort, language).map((row) => (
              <tr key={row.char_short} data-character={row.char_short}>
                <th scope="row">
                  <Link href={`/top/${encodeURIComponent(row.char_short)}`}>
                    {characterLabel(row.char_short, row.char_name, language)}{" "}
                    <small>({row.char_short})</small>
                  </Link>
                </th>
                {columns.map((column) => {
                  const entry = row.matchups.find(
                    (entry) => entry.char_short === column.char_short,
                  );
                  const rate = matchupRate(entry);
                  const detail = `${characterLabel(row.char_short, row.char_name, language)} vs ${characterLabel(column.char_short, column.char_name, language)} · ${rate === null ? messages.missing : `${messages.wins}: ${entry?.wins.toLocaleString(language)} / ${messages.games}: ${entry?.total_games.toLocaleString(language)}`}`;
                  return (
                    <td
                      key={column.char_short}
                      data-opponent={column.char_short}
                      className={rateClass(rate)}
                      title={detail}
                    >
                      {rate === null ? "—" : `${rate.toFixed(2)}%`}
                      <span className={shared.visuallyHidden}> · {detail}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <h3>{messages.weighted}</h3>
      <p className={styles.description}>{messages.weightedNote}</p>
      <div className={styles.summaryWrap}>
        <table
          className={styles.summary}
          aria-label={`${title} · ${messages.weighted}`}
        >
          <thead>
            <tr>
              <th scope="col">{messages.character}</th>
              <th scope="col">{messages.winRate}</th>
              <th scope="col">{messages.games}</th>
            </tr>
          </thead>
          <tbody>
            {getCharacterWinRates(rows).map((row) => {
              const source = rows.find(
                (entry) => entry.char_short === row.charShort,
              );
              const games =
                source?.matchups.reduce(
                  (sum, entry) => sum + entry.total_games,
                  0,
                ) ?? 0;
              return (
                <tr key={row.charShort}>
                  <th scope="row">
                    <Link href={`/top/${encodeURIComponent(row.charShort)}`}>
                      {characterLabel(row.charShort, row.charName, language)}
                    </Link>
                  </th>
                  <td>{games > 0 ? `${row.winRate.toFixed(2)}%` : "—"}</td>
                  <td>{games.toLocaleString(language)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function LadderMatchupContent({
  data,
  query,
  language,
}: {
  data: MatchupResponse | null;
  query: PageSearchParams;
  language: Language;
}) {
  const messages = getMessages(language).matchup;
  return (
    <section className={shared.content} aria-labelledby="matchup-title">
      <StatisticsNavigation language={language} current="matchup" />
      <div className={shared.sectionHeading}>
        <p>
          {messages.title} / {messages.period}
        </p>
        <h1 id="matchup-title">
          {messages.heading} <span>{messages.accent}</span>
        </h1>
      </div>
      <p className={styles.description}>{messages.explanation}</p>
      {!data ? (
        <p className={shared.error} role="alert">
          {messages.error}
        </p>
      ) : (
        <>
          <a
            className={styles.export}
            href="/matchup/export"
            download="ggst-matchups.csv"
          >
            {messages.export}
          </a>
          <ul className={styles.legend} aria-label={messages.legend}>
            <li className={styles.favorable}>{messages.favorable}</li>
            <li className={styles.neutral}>{messages.neutral}</li>
            <li className={styles.unfavorable}>{messages.unfavorable}</li>
            <li className={styles.missing}>— {messages.missing}</li>
          </ul>
          {(
            [
              ["all", messages.all, data.data_all],
              ["vanquisher", messages.vanquisher, data.data_vanq],
            ] as const
          ).map(([kind, title, rows]) => (
            <section
              className={styles.panel}
              key={kind}
              aria-labelledby={`${kind}-matchups-title`}
              data-matchups={kind}
            >
              <h2 id={`${kind}-matchups-title`}>{title}</h2>
              {rows.length ? (
                <Matrix
                  rows={rows}
                  kind={kind}
                  query={query}
                  language={language}
                  title={title}
                />
              ) : (
                <p className={shared.note}>{messages.empty}</p>
              )}
            </section>
          ))}
          <p className={shared.note}>{messages.updated}</p>
          <p className={shared.note}>
            {messages.checked}: <PlayerDateTime value={data.last_update} />
          </p>
        </>
      )}
    </section>
  );
}
