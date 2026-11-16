"use client";
import { type CSSProperties, useState } from "react";
import type { Matchup } from "../../interfaces/PlayerMatchups";
import { getMessages } from "../../lib/i18n";
import { characterLabel, getCharacterArt } from "../../lib/ladder-characters";
import type { Language } from "../../lib/site-preferences";
import { AppLink as Link } from "../AppLink";
import styles from "./player.module.css";

export function WinRateList({
  entries,
  language,
}: {
  entries: Matchup[];
  language: Language;
}) {
  const messages = getMessages(language).player;
  const [sort, setSort] = useState<"most" | "highest" | "lowest">("most");
  const rows = [...entries].sort((a, b) => {
    const difference = b.wins / b.total_games - a.wins / a.total_games;
    return sort === "most"
      ? b.total_games - a.total_games || difference
      : (sort === "lowest" ? -difference : difference) ||
          b.total_games - a.total_games;
  });
  return (
    <>
      <fieldset className={styles.winRateSort} aria-label={messages.winRate}>
        {(
          [
            ["most", messages.mostMatches],
            ["highest", messages.highestWinRate],
            ["lowest", messages.lowestWinRate],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            data-win-rate-sort={value}
            aria-pressed={sort === value}
            onClick={() => setSort(value)}
          >
            {label}
          </button>
        ))}
      </fieldset>
      <div className={styles.winRates}>
        {rows.map((row) => {
          const art = getCharacterArt(row.char_short);
          const rate = (row.wins / row.total_games) * 100;
          return (
            <div
              className={styles.winRateRow}
              key={row.char_short}
              style={{ opacity: row.total_games < 5 ? 0.55 : 1 }}
            >
              <Link
                className={styles.winRateCharacter}
                href={`/top/${encodeURIComponent(row.char_short)}`}
                title={characterLabel(row.char_short, row.char_name, language)}
              >
                {art && (
                  // biome-ignore lint/performance/noImgElement: decorative local character art with fixed dimensions.
                  <img
                    src={`/ladder/characters/${art.art}.webp`}
                    width={40}
                    height={40}
                    alt=""
                    loading="lazy"
                  />
                )}
                <span>
                  {characterLabel(row.char_short, row.char_name, language)}
                </span>
              </Link>
              <meter
                className={styles.winRateTrack}
                min={0}
                max={100}
                value={rate}
                aria-label={characterLabel(
                  row.char_short,
                  row.char_name,
                  language,
                )}
                style={
                  {
                    "--win-color": rate < 50 ? "#e8282f" : "#25e7d4",
                  } as CSSProperties
                }
              >
                {rate.toFixed(1)}%
              </meter>
              <div className={styles.winRateStats}>
                <b>{rate.toFixed(1)}%</b>
                <small
                  title={`${row.wins} ${messages.wins} / ${row.total_games - row.wins} ${messages.losses} · ${row.total_games} ${messages.games}`}
                >
                  {row.wins}–{row.total_games - row.wins} · {row.total_games}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
