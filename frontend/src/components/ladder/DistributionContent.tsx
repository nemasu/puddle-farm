import type { DistributionResponse } from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import { DistributionChart } from "../classic/DistributionChart";
import { PlayerDateTime } from "../classic/PlayerFormatting";
import shared from "./ladder.module.css";
import { StatisticsNavigation } from "./StatisticsNavigation";
import styles from "./stats.module.css";

export function LadderDistributionContent({
  data,
  language,
}: {
  data: DistributionResponse | null;
  language: Language;
}) {
  const messages = getMessages(language).distribution;
  const entries =
    data?.data.distribution_rating.filter((row) => row.upper_bound !== 1) ?? [];
  const placement =
    data?.data.distribution_rating
      .filter((row) => row.upper_bound === 1)
      .reduce((sum, row) => sum + row.count, 0) ?? 0;
  return (
    <section className={shared.content} aria-labelledby="distribution-title">
      <StatisticsNavigation language={language} current="distribution" />
      <div className={shared.sectionHeading}>
        <p>{messages.title}</p>
        <h1 id="distribution-title">
          {messages.heading} <span>{messages.accent}</span>
        </h1>
      </div>
      <p className={shared.note}>{messages.explanation}</p>
      {!data ? (
        <p className={shared.error} role="alert">
          {messages.error}
        </p>
      ) : (
        <>
          <p>
            {messages.sample}:{" "}
            <strong>
              {data.data.one_month_players.toLocaleString(language)}
            </strong>{" "}
            · {messages.placement}:{" "}
            <strong>{placement.toLocaleString(language)}</strong>
          </p>
          <section className={styles.panel} aria-label={messages.title}>
            {entries.length ? (
              <DistributionChart
                entries={entries}
                language={language}
                design="ladder"
              />
            ) : (
              <p>{messages.empty}</p>
            )}
            <noscript>
              <p>{messages.noscript}</p>
            </noscript>
            <div className={styles.tableWrap}>
              <table aria-label={messages.title}>
                <thead>
                  <tr>
                    {[
                      messages.rank,
                      messages.count,
                      messages.percentage,
                      messages.percentile,
                    ].map((label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr key={row.lower_bound}>
                      <th scope="row">
                        {Utils.getRankDisplayName(row.lower_bound)}
                      </th>
                      <td>{row.count.toLocaleString(language)}</td>
                      <td>{row.percentage.toFixed(2)}%</td>
                      <td>{row.percentile.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className={shared.note}>
            {getMessages(language).popularity.updated}
          </p>
          <p className={shared.note}>
            {getMessages(language).popularity.checked}:{" "}
            <PlayerDateTime value={data.timestamp} />
          </p>
        </>
      )}
      <section className={styles.panel} aria-labelledby="thresholds-title">
        <h2 id="thresholds-title">{messages.thresholds}</h2>
        <p className={shared.note}>{messages.thresholdNote}</p>
        <div className={styles.tableWrap}>
          <table aria-label={messages.thresholds}>
            <thead>
              <tr>
                <th scope="col" aria-label={messages.rank} />
                <th scope="col">{messages.rank}</th>
                <th scope="col">{messages.minimum}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{Utils.displayRankIcon(0, "48px", true)}</td>
                <th scope="row">Imperius</th>
                <td>{messages.top100}</td>
              </tr>
              {Utils.getRankThresholds().map((row) => (
                <tr key={row.rating}>
                  <td>{Utils.displayRankIcon(row.rating, "48px")}</td>
                  <th scope="row">{row.name}</th>
                  <td>{Utils.formatRankThresholdRating(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
