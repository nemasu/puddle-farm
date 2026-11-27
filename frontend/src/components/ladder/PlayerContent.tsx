import type { CSSProperties } from "react";
import { Suspense } from "react";
import type {
  PlayerResponse,
  PlayerResponsePlayer,
} from "../../interfaces/API";
import { API_ENDPOINT } from "../../lib/api-endpoint";
import { getMessages } from "../../lib/i18n";
import { characterLabel, getCharacterArt } from "../../lib/ladder-characters";
import type { Pagination } from "../../lib/pagination";
import {
  getPlayerChartData,
  getPlayerComment,
  getPlayerMatchupData,
  optionalJson,
} from "../../lib/server/player";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import { AppLink as Link } from "../AppLink";
import { PlayerAvatar } from "../classic/PlayerAvatar";
import {
  PlayerAutoRefresh,
  PlayerProfileRefresh,
  PlayerSync,
} from "../classic/PlayerControls";
import { PlayerDateTime } from "../classic/PlayerFormatting";
import Matchup from "../PlayerMatchup";
import RatingChart from "../RatingChart";
import { LadderPlayerHistory, loadPlayerHistory } from "./PlayerHistory";
import styles from "./player.module.css";
import { WinRateList } from "./WinRateList";

async function Aliases({
  player,
  language,
}: {
  player: PlayerResponse;
  language: Language;
}) {
  const aliases =
    (await optionalJson<string[]>(`/alias/${player.id}`))?.filter(
      (name) => name !== player.name,
    ) ?? [];
  return aliases.length ? (
    <p className={styles.aliases}>
      {getMessages(language).player.aliases}: {aliases.join(" · ")}
    </p>
  ) : null;
}
async function Comment({ id }: { id: bigint }) {
  const comment = await getPlayerComment(id);
  return comment ? <p className={styles.comment}>{comment}</p> : null;
}
async function Chart({
  player,
  selected,
  language,
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer;
  language: Language;
}) {
  if (selected.match_count <= 0)
    return <p>{getMessages(language).player.noChart}</p>;
  const initialHistory = await getPlayerChartData(
    player.id,
    selected.char_short,
    selected.match_count,
  );
  return (
    <RatingChart
      key={`${player.id}-${selected.char_short}`}
      player_id={player.id}
      char_short={selected.char_short}
      API_ENDPOINT={API_ENDPOINT}
      latest_rating={selected.rating}
      total_games={selected.match_count}
      initialHistory={initialHistory}
      language={language}
    />
  );
}
async function Matchups({
  player,
  selected,
  language,
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer;
  language: Language;
}) {
  const data = await getPlayerMatchupData(player.id, selected.char_short);
  return (
    <Matchup
      key={`${player.id}-${selected.char_short}`}
      player_id={player.id}
      char_short={selected.char_short}
      API_ENDPOINT={API_ENDPOINT}
      initialData={data.personal}
      initialGlobal={data.global}
      language={language}
    />
  );
}

async function WinRateBars({
  player,
  selected,
  language,
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer;
  language: Language;
}) {
  const messages = getMessages(language).player;
  const data = await getPlayerMatchupData(player.id, selected.char_short);
  const rows =
    data.personal?.matchups.filter((row) => row.total_games > 0) ?? [];
  if (!rows.length)
    return <p>{data.personal ? messages.noGames : messages.noData}</p>;
  return <WinRateList entries={rows} language={language} />;
}

export async function LadderPlayerContent({
  player,
  selected,
  character,
  pagination,
  language,
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer | null;
  character?: string;
  pagination: Pagination;
  language: Language;
}) {
  const messages = getMessages(language).player;
  // Match history is core content; optional sections stream after this request completes.
  const history =
    selected && character
      ? await loadPlayerHistory(player, character, pagination)
      : null;
  const art = selected ? getCharacterArt(selected.char_short) : null;
  const totalGames = player.ratings.reduce(
    (sum, rating) => sum + rating.match_count,
    0,
  );
  const peak = player.ratings.reduce<PlayerResponsePlayer | null>(
    (best, rating) =>
      !best || rating.top_rating.value > best.top_rating.value ? rating : best,
    null,
  );
  const bestWin = player.ratings.reduce<PlayerResponsePlayer | null>(
    (best, rating) =>
      !best || rating.top_defeated.value > best.top_defeated.value
        ? rating
        : best,
    null,
  );
  return (
    <>
      <section className={styles.hero} aria-labelledby="player-title">
        {art && (
          <div
            className={styles.art}
            aria-hidden="true"
            style={
              {
                "--focus-x": `${art.x / 16}%`,
                "--focus-y": `${art.y / 16}%`,
              } as CSSProperties
            }
          >
            {/* biome-ignore lint/performance/noImgElement: decorative local character art, no optimizer request. */}
            <img
              src={`/ladder/characters/${art.art}.webp`}
              width={1600}
              height={1600}
              alt=""
            />
          </div>
        )}
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>
            PLAYER /{" "}
            {selected
              ? characterLabel(
                  selected.char_short,
                  selected.character,
                  language,
                )
              : messages.title}
          </p>
          <h1 id="player-title">{player.name}</h1>
          <div className={styles.badges}>
            <span className={styles.badge}>{player.platform}</span>
            {player.status && player.status !== "Public" && (
              <span className={styles.badge}>{player.status}</span>
            )}
            {player.tags?.map((tag) => (
              <span
                key={tag.tag}
                className={styles.badge}
                style={JSON.parse(tag.style)}
              >
                {tag.tag}
              </span>
            ))}
          </div>
          <div className={styles.aliasSlot}>
            <Suspense fallback={null}>
              <Aliases player={player} language={language} />
            </Suspense>
          </div>
          {selected && (
            <div className={styles.heroStats}>
              <div>
                <span>{messages.rating}</span>
                <b>{Utils.displayRating(selected.rating)}</b>
                {Utils.displayRankIcon(
                  selected.rating,
                  "64px",
                  selected.is_legend,
                )}
              </div>
              <div>
                <span>{messages.characterRank}</span>
                <b>
                  {selected.top_char ? (
                    <Link
                      href={`/top/${encodeURIComponent(selected.char_short)}`}
                    >
                      #{selected.top_char.toLocaleString(language)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </b>
              </div>
              <div>
                <span>{messages.games}</span>
                <b>{selected.match_count.toLocaleString(language)}</b>
              </div>
            </div>
          )}
        </div>
      </section>
      <div className={styles.content}>
        <div className={styles.tiles}>
          <div>
            <span>{messages.overall}</span>
            <b>
              {player.top_global ? (
                <Link href="/top_global">
                  #{player.top_global.toLocaleString(language)}
                </Link>
              ) : (
                "—"
              )}
            </b>
          </div>
          <div>
            <span>{messages.totalGames}</span>
            <b>{totalGames.toLocaleString(language)}</b>
            <small>
              {messages.characters}: {player.ratings.length}
            </small>
          </div>
          <div>
            <span>{messages.peak}</span>
            <b>
              {peak?.top_rating.value
                ? Utils.displayRating(peak.top_rating.value)
                : "—"}
            </b>
            {peak && peak.top_rating.value !== 0 && (
              <small>
                {characterLabel(peak.char_short, peak.character, language)} ·{" "}
                <PlayerDateTime value={peak.top_rating.timestamp} />
              </small>
            )}
          </div>
          <div>
            <span>{messages.bestWin}</span>
            <b>
              {bestWin?.top_defeated.value
                ? Utils.displayRating(bestWin.top_defeated.value)
                : "—"}
            </b>
            {bestWin && bestWin.top_defeated.value !== 0 && (
              <small>
                <Link
                  href={`/player/${bestWin.top_defeated.id}/${encodeURIComponent(bestWin.top_defeated.char_short)}`}
                >
                  {bestWin.top_defeated.name}
                </Link>
              </small>
            )}
          </div>
        </div>
        <h2 className={styles.label}>{messages.characters}</h2>
        <nav className={styles.characters} aria-label={messages.characters}>
          {[...player.ratings]
            .sort((a, b) => b.rating - a.rating)
            .map((rating) => (
              <Link
                key={rating.char_short}
                href={`/player/${player.id}/${encodeURIComponent(rating.char_short)}`}
                aria-current={
                  rating.char_short === character ? "page" : undefined
                }
              >
                {Utils.displayRankIcon(rating.rating, "40px", rating.is_legend)}
                <span>
                  <b>
                    {characterLabel(
                      rating.char_short,
                      rating.character,
                      language,
                    )}
                  </b>
                  <small>
                    {Utils.displayRating(rating.rating)} ·{" "}
                    {rating.match_count.toLocaleString(language)}{" "}
                    {messages.games}
                  </small>
                </span>
              </Link>
            ))}
        </nav>
        <div className={styles.columns}>
          <div className={styles.main}>
            {selected && character ? (
              <>
                <div className={styles.selected}>
                  <h2>
                    {characterLabel(character, selected.character, language)} ·{" "}
                    {Utils.displayRating(selected.rating)}
                  </h2>
                  <PlayerSync playerId={player.id} language={language} />
                </div>
                <div className={styles.records}>
                  {selected.top_rating.value !== 0 && (
                    <p>
                      {messages.peak}:{" "}
                      <strong>
                        {Utils.displayRating(selected.top_rating.value)}
                      </strong>{" "}
                      · <PlayerDateTime value={selected.top_rating.timestamp} />
                    </p>
                  )}
                  {selected.top_defeated.value !== 0 && (
                    <p>
                      {messages.bestWin}:{" "}
                      <Link
                        href={`/player/${selected.top_defeated.id}/${encodeURIComponent(selected.top_defeated.char_short)}`}
                      >
                        {selected.top_defeated.name} (
                        {characterLabel(
                          selected.top_defeated.char_short,
                          selected.top_defeated.char_short,
                          language,
                        )}
                        )
                      </Link>{" "}
                      · {Utils.displayRating(selected.top_defeated.value)} ·{" "}
                      <PlayerDateTime value={selected.top_defeated.timestamp} />
                    </p>
                  )}
                </div>
                <PlayerAutoRefresh
                  key={`${player.id}-${character}`}
                  language={language}
                />
                <section
                  className={`${styles.panel} ${styles.chart}`}
                  aria-labelledby="player-chart-title"
                >
                  <h2 id="player-chart-title">{messages.chart}</h2>
                  <Suspense
                    key={`${player.id}-${character}-chart`}
                    fallback={<p>{messages.loadingChart}</p>}
                  >
                    <Chart
                      player={player}
                      selected={selected}
                      language={language}
                    />
                  </Suspense>
                  <noscript>
                    <p>{messages.chartNoscript}</p>
                  </noscript>
                </section>
                <section className={styles.panel} aria-label={messages.winRate}>
                  <h2 id="player-winrates-title">{messages.matchups}</h2>
                  <p>{messages.threeMonths}</p>
                  <div className={styles.winRateViewport}>
                    <Suspense
                      key={`${player.id}-${character}-bars`}
                      fallback={<p>{messages.loadingMatchups}</p>}
                    >
                      <WinRateBars
                        player={player}
                        selected={selected}
                        language={language}
                      />
                    </Suspense>
                  </div>
                </section>
                <LadderPlayerHistory
                  player={player}
                  character={character}
                  pagination={pagination}
                  data={history}
                  language={language}
                />
                <section
                  className={`${styles.panel} ${styles.matchups}`}
                  aria-labelledby="player-matchups-title"
                >
                  <h2 id="player-matchups-title">{messages.matchups}</h2>
                  <Suspense
                    key={`${player.id}-${character}-matchups`}
                    fallback={
                      <>
                        <p>{messages.loadingMatchups}</p>
                        <noscript>
                          <Link href="/matchup">
                            {messages.matchupsNoscript}
                          </Link>
                        </noscript>
                      </>
                    }
                  >
                    <Matchups
                      player={player}
                      selected={selected}
                      language={language}
                    />
                  </Suspense>
                </section>
              </>
            ) : (
              <p>
                {player.ratings.length
                  ? messages.noCharacter
                  : messages.noRatings}
              </p>
            )}
          </div>
          <aside className={styles.profile} aria-label={messages.profile}>
            <div className={styles.profileFrame}>
              <div className={styles.commentSlot}>
                <Suspense fallback={null}>
                  <Comment id={player.id} />
                </Suspense>
              </div>
              <PlayerAvatar playerId={player.id} alt={messages.avatar} />
              <PlayerProfileRefresh
                key={player.id}
                playerId={player.id}
                language={language}
              />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
