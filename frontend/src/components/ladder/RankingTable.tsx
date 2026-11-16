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
    "--fx": art.x,
    "--fy": art.y,
    "--k": 1 / art.scale,
  } as CSSProperties;
  return (
    <span className={styles.rowArt} aria-hidden="true">
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
        <colgroup>
          {ranked && <col className={styles.rankColumn} />}
          <col
            className={ranked ? styles.playerColumn : styles.searchPlayerColumn}
          />
          <col className={styles.characterColumn} />
          <col />
        </colgroup>
        <thead>
          <tr>
            {ranked && (
              <th scope="col">
                #<span className={styles.visuallyHidden}>{messages.rank}</span>
              </th>
            )}
            <th scope="col">{messages.player}</th>
            <th scope="col">{messages.character}</th>
            <th scope="col" className={styles.number}>
              {messages.rating}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((player) => (
            <tr key={`${player.id}-${player.char_short}`}>
              {ranked && (
                <td
                  className={`${styles.rank} ${player.rank != null && player.rank <= 3 ? styles[`place${player.rank}`] : ""}`}
                >
                  <span>{player.rank}</span>
                  <CharacterArt player={player} />
                </td>
              )}
              <td className={!ranked ? styles.playerArtCell : undefined}>
                <div className={styles.playerCell}>
                  <span className={styles.rankIcon}>
                    {Utils.displayRankIcon(
                      player.rating,
                      "66px",
                      legend || player.is_legend === true,
                    )}
                  </span>
                  <div className={styles.playerName}>
                    <Link
                      href={`/player/${player.id}/${encodeURIComponent(player.char_short)}`}
                    >
                      {player.name}
                    </Link>
                    <small>
                      {legend || player.is_legend
                        ? messages.tier
                        : Utils.getRankDisplayName(player.rating)}
                    </small>
                    {(player.tags ?? []).map((tag) => (
                      <span
                        className={styles.tag}
                        key={tag.tag}
                        style={tag.style}
                      >
                        {tag.tag}
                      </span>
                    ))}
                  </div>
                </div>
                {!ranked && <CharacterArt player={player} />}
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
              <td
                className={`${styles.number} ${styles.rating}`}
                title={String(player.rating)}
              >
                {Utils.displayRating(player.rating)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
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
