import type { PlayerResponse } from "../../interfaces/API";
import { getMessages } from "../../lib/i18n";
import { characterLabel } from "../../lib/ladder-characters";
import type { Pagination } from "../../lib/pagination";
import { getPlayerHistory } from "../../lib/server/player";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import { AppLink as Link } from "../AppLink";
import {
  PlayerDateTime,
  PlayerRatingChange,
} from "../classic/PlayerFormatting";
import styles from "./player.module.css";

export async function loadPlayerHistory(
  player: PlayerResponse,
  character: string,
  pagination: Pagination,
) {
  try {
    return await getPlayerHistory(player, character, pagination);
  } catch (error) {
    console.error("Could not load player history:", error);
    return null;
  }
}

export function LadderPlayerHistory({
  player,
  character,
  pagination,
  data,
  language,
}: {
  player: PlayerResponse;
  character: string;
  pagination: Pagination;
  data: Awaited<ReturnType<typeof loadPlayerHistory>>;
  language: Language;
}) {
  const messages = getMessages(language).player;
  const navigation = (
    <nav className={styles.pagination} aria-label={messages.history}>
      <Link
        href={`/player/${player.id}/${encodeURIComponent(character)}/${pagination.count}/${Math.max(0, pagination.offset - pagination.count)}`}
      >
        {getMessages(language).ladder.prev}
      </Link>
      {data?.showNext &&
        Number.isSafeInteger(pagination.offset + pagination.count) && (
          <Link
            href={`/player/${player.id}/${encodeURIComponent(character)}/${pagination.count}/${pagination.offset + pagination.count}`}
          >
            {getMessages(language).ladder.next}
          </Link>
        )}
    </nav>
  );
  return (
    <section
      className={styles.panel}
      aria-labelledby="player-history-title"
      data-player-history
    >
      <h2 id="player-history-title">{messages.history}</h2>
      {!data ? (
        <p role="alert">{messages.historyError}</p>
      ) : (
        <>
          {navigation}
          {!data.groups.length && <p>{messages.emptyHistory}</p>}
          <div className={styles.historyGroups}>
            {data.groups.map((group) => {
              const oldest = group.matches[group.matches.length - 1];
              return (
                <details
                  className={styles.match}
                  data-result={group.wins > group.losses ? "win" : "loss"}
                  key={`${group.timestamp}-${group.opponent_id}`}
                >
                  <summary>
                    <span className={styles.matchTime}>
                      <PlayerDateTime value={group.timestamp} />
                      <small>
                        {Utils.displayRating(oldest.own_rating_value)}
                      </small>
                    </span>
                    <span className={styles.opponent}>
                      {group.opponent_name}
                      {(data.tags[group.opponent_id.toString()] ?? []).map(
                        (tag) => (
                          <span
                            className={styles.badge}
                            key={tag.tag}
                            style={JSON.parse(tag.style)}
                          >
                            {tag.tag}
                          </span>
                        ),
                      )}
                      <small>
                        <Link
                          href={`/top/${encodeURIComponent(group.opponent_character_short)}`}
                        >
                          {characterLabel(
                            group.opponent_character_short,
                            group.matches[0].opponent_character,
                            language,
                          )}
                        </Link>{" "}
                        · {Utils.displayRating(oldest.opponent_rating_value)}
                      </small>
                    </span>
                    <span className={styles.result}>
                      {group.wins} – {group.losses}
                      <small>
                        <PlayerRatingChange
                          change={group.ratingChange}
                          ladder
                        />
                      </small>
                    </span>
                  </summary>
                  <div className={styles.matchBody}>
                    <Link
                      href={`/player/${group.opponent_id}/${encodeURIComponent(group.opponent_character_short)}`}
                    >
                      {group.opponent_name}
                    </Link>
                    <div className={styles.scroll}>
                      <table aria-label={messages.details}>
                        <thead>
                          <tr>
                            {[
                              messages.timestamp,
                              messages.rating,
                              messages.opponentRating,
                              messages.result,
                              messages.change,
                            ].map((label) => (
                              <th key={label} scope="col">
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.matches.map((match) => (
                            <tr key={match.timestamp}>
                              <td>
                                <PlayerDateTime value={match.timestamp} />
                              </td>
                              <td>
                                {Utils.displayRating(match.own_rating_value)}
                              </td>
                              <td>
                                {Utils.displayRating(
                                  match.opponent_rating_value,
                                )}
                              </td>
                              <td>
                                {match.result_win
                                  ? messages.win
                                  : messages.loss}
                              </td>
                              <td>
                                {Utils.formatRatingChange(match.ratingChange)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
          {navigation}
        </>
      )}
    </section>
  );
}
