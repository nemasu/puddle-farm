import type { CSSProperties } from "react";
import { getMessages } from "../../lib/i18n";
import { characterLabel, getCharacterArt } from "../../lib/ladder-characters";
import type { RankingEntry } from "../../lib/rankings";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import { AppLink as Link } from "../AppLink";
import styles from "./ladder.module.css";

export type LadderRow = Pick<
  RankingEntry,
  "id" | "name" | "rating" | "char_short" | "char_long"
> &
  Partial<Pick<RankingEntry, "rank" | "tags" | "is_legend">>;

function CharacterArt({ player }: { player: LadderRow }) {
  const art = getCharacterArt(player.char_short);
  if (!art) return null;
  const focus = {
    "--fx": art.x + (art.rankingOffsetX ?? 0),
    "--fy": art.y,
    "--k": 1 / art.scale,
  } as CSSProperties;
  return (
    <>
      <span className={styles.ghost}>{art.en.toUpperCase()}</span>
      <span className={styles.artImage} style={focus}>
        {/* biome-ignore lint/performance/noImgElement: decorative local art has fixed source geometry and no optimizer request. */}
        <img
          src={`/ladder/characters/${art.art}.webp`}
          alt=""
          width={1600}
          height={1600}
          loading="lazy"
          decoding="async"
        />
      </span>
    </>
  );
}

// Decorative banner layer painted behind the row's cells.
function RowBanner({ player }: { player: LadderRow }) {
  return (
    <span className={styles.banner} aria-hidden="true">
      <span className={styles.band} />
      <span className={styles.slash} />
      <CharacterArt player={player} />
      <span className={styles.ratingBlock} />
    </span>
  );
}

export function LadderRankingTable({
  rows,
  language,
  label,
  emptyMessage,
  legend = false,
  ranked = true,
}: {
  rows: LadderRow[];
  language: Language;
  label: string;
  emptyMessage: string;
  legend?: boolean;
  ranked?: boolean;
}) {
  const messages = getMessages(language).ladder;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.ladder} aria-label={label}>
        <thead className={styles.visuallyHidden}>
          <tr>
            {ranked && <th scope="col">{messages.rank}</th>}
            <th scope="col">{messages.player}</th>
            <th scope="col">{messages.character}</th>
            <th scope="col">{messages.rating}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player) => (
            <tr key={`${player.id}-${player.char_short}`}>
              {ranked && (
                <td className={styles.rank}>
                  <span>{player.rank}</span>
                </td>
              )}
              <td className={styles.playerCell}>
                <RowBanner player={player} />
                <span className={styles.rankIcon}>
                  {Utils.displayRankIcon(
                    player.rating,
                    "84px",
                    legend || player.is_legend === true,
                  )}
                </span>
                {(player.tags ?? []).length > 0 && (
                  <span className={styles.tags}>
                    {(player.tags ?? []).map((tag) => (
                      <span
                        className={styles.tag}
                        key={tag.tag}
                        style={tag.style}
                      >
                        {tag.tag}
                      </span>
                    ))}
                  </span>
                )}
                <span className={styles.playerName}>
                  <Link
                    href={`/player/${player.id}/${encodeURIComponent(player.char_short)}`}
                  >
                    <span>{player.name}</span>
                  </Link>
                  <small>
                    {legend || player.is_legend
                      ? messages.tier
                      : Utils.getRankDisplayName(player.rating)}
                  </small>
                </span>
              </td>
              <td className={styles.character}>
                <Link href={`/top/${encodeURIComponent(player.char_short)}`}>
                  {characterLabel(
                    player.char_short,
                    player.char_long,
                    language,
                  )}
                </Link>
              </td>
              <td className={styles.rating} title={String(player.rating)}>
                {Utils.displayRating(player.rating)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className={styles.emptyRow}>
              <td colSpan={ranked ? 4 : 3} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
