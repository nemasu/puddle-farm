import { Suspense } from "react";
import type {
  HourlyPlayersResponse,
  StatsResponse,
} from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import { readApiResponse, readJson } from "../../lib/server/api";
import type { Language } from "../../lib/site-preferences";
import { PlayerDateTime } from "../classic/PlayerFormatting";
import HourlyPlayersChart from "../HourlyPlayersChart";
import shared from "./ladder.module.css";
import { PlayerWidgets as LadderWidgets } from "./PlayerWidgets";
import { StatisticsNavigation } from "./StatisticsNavigation";
import styles from "./stats.module.css";

async function ActivityChart({ language }: { language: Language }) {
  const hourly = await readJson<HourlyPlayersResponse>(
    "/stats/hourly-players?range=30d",
  ).catch(() => null);
  return (
    <HourlyPlayersChart
      initialPoints={hourly?.points ?? null}
      language={language}
      design="ladder"
    />
  );
}
async function MatchUpdates({ language }: { language: Language }) {
  const messages = getMessages(language);
  const health = await readApiResponse("/ingestion/health").catch(() => null);
  return (
    <p className={shared.note}>
      {messages.stats.health}: {health?.body || messages.common.ingestionError}
    </p>
  );
}

export async function LadderStatsContent({ language }: { language: Language }) {
  const messages = getMessages(language).stats;
  const stats = await readJson<StatsResponse>("/stats").catch(() => null);
  const periods = stats
    ? ([
        [messages.total, stats.total_players, stats.total_games],
        [messages.month, stats.one_month_players, stats.one_month_games],
        [messages.week, stats.one_week_players, stats.one_week_games],
        [messages.day, stats.one_day_players, stats.one_day_games],
        [messages.hour, stats.one_hour_players, stats.one_hour_games],
      ] as const)
    : [];
  return (
    <section className={shared.content} aria-labelledby="stats-title">
      <StatisticsNavigation language={language} current="stats" />
      <div className={shared.sectionHeading}>
        <p>{messages.title}</p>
        <h1 id="stats-title">
          {messages.heading} <span>{messages.accent}</span>
        </h1>
      </div>
      {stats ? (
        <>
          <dl className={styles.cards}>
            {[
              [messages.players, stats.total_players],
              [messages.monthPlayers, stats.one_month_players],
              [`${messages.day} · ${messages.games}`, stats.one_day_games],
              [messages.games, stats.total_games],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{Number(value).toLocaleString(language)}</dd>
              </div>
            ))}
          </dl>
          <section
            className={styles.panel}
            aria-labelledby="activity-summary-title"
          >
            <h2 id="activity-summary-title">{messages.summary}</h2>
            <div className={styles.tableWrap}>
              <table aria-label={messages.summary}>
                <thead>
                  <tr>
                    <th scope="col">{messages.period}</th>
                    <th scope="col">{messages.players}</th>
                    <th scope="col">{messages.games}</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map(([label, players, games]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{players.toLocaleString(language)}</td>
                      <td>{games.toLocaleString(language)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={shared.note}>
              {messages.checked}: <PlayerDateTime value={stats.timestamp} />
            </p>
            <p className={shared.note}>{messages.updated}</p>
          </section>
        </>
      ) : (
        <p className={shared.error} role="alert">
          {messages.error}
        </p>
      )}
      <section
        className={`${styles.panel} ${styles.chart}`}
        aria-label={messages.hourly}
      >
        <LadderWidgets>
          <Suspense
            fallback={
              <>
                <h2>{messages.hourly}</h2>
                <p>{messages.loading}</p>
              </>
            }
          >
            <ActivityChart language={language} />
          </Suspense>
        </LadderWidgets>
        <noscript>
          <p>{messages.noscript}</p>
        </noscript>
      </section>
      <Suspense
        fallback={<p className={shared.note}>{messages.healthLoading}</p>}
      >
        <MatchUpdates language={language} />
      </Suspense>
    </section>
  );
}
