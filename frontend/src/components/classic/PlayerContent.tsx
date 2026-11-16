import { AppBar, Box, Typography } from "@mui/material";
import { Suspense } from "react";
import type {
  PlayerResponse,
  PlayerResponsePlayer,
} from "../../interfaces/API";
import { API_ENDPOINT } from "../../lib/api-endpoint";
import { getClassicMessages } from "../../lib/i18n/classic";
import { characterLabel } from "../../lib/ladder-characters";
import type { Pagination } from "../../lib/pagination";
import {
  getPlayerChartData,
  getPlayerComment,
  getPlayerMatchupData,
  optionalJson,
} from "../../lib/server/player";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";
import Matchup from "../PlayerMatchup";
import RatingChart from "../RatingChart";
import { Tag } from "../Tag";
import { LinkButton } from "./LinkButton";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerAutoRefresh, PlayerSync } from "./PlayerControls";
import { PlayerDateTime } from "./PlayerFormatting";
import { PlayerHistory } from "./PlayerHistory";

async function Aliases({
  player,
  language = "en",
}: {
  player: PlayerResponse;
  language?: Language;
}) {
  const messages = getClassicMessages(language).player;
  const aliases =
    (await optionalJson<string[]>(`/alias/${player.id}`))?.filter(
      (name) => name !== player.name,
    ) ?? [];
  return aliases.length ? (
    <Box sx={{ textAlign: "center", fontSize: 17, m: 1 }}>
      <Typography variant="platform">{messages.aliases}</Typography>
      {aliases.map((name) => (
        <Typography
          key={name}
          variant="playerName"
          sx={{ px: 0.8, py: 0.2, mx: 0.3, my: 0.2, display: "inline-block" }}
        >
          {name}
        </Typography>
      ))}
    </Box>
  ) : null;
}

async function Comment({ id }: { id: bigint }) {
  const comment = await getPlayerComment(id);
  return comment ? (
    <Box
      sx={{
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: "12px",
        p: "12px",
        m: "10px",
      }}
    >
      <Typography sx={{ fontSize: 13, overflowWrap: "anywhere" }}>
        {comment}
      </Typography>
    </Box>
  ) : null;
}

function CharacterStats({
  player,
  selected,
  language = "en",
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer;
  language?: Language;
}) {
  const messages = getClassicMessages(language).player;
  return (
    <>
      <Typography component="h2" variant="h5" sx={{ my: 2 }}>
        {language === "ja"
          ? characterLabel(selected.char_short, selected.character, language)
          : selected.character}{" "}
        {messages.rating}: {Utils.displayRating(selected.rating)} (
        {selected.match_count} {messages.games})
        <PlayerSync
          playerId={player.id}
          language={language === "ja" ? "ja" : "en"}
        />
        {selected.top_char !== 0 && (
          <LinkButton href={`/top/${selected.char_short}`} sx={{ ml: 1 }}>
            <Typography variant="char_rank" component="span">
              #{selected.top_char}{" "}
              {language === "ja"
                ? characterLabel(
                    selected.char_short,
                    selected.character,
                    language,
                  )
                : selected.character}
            </Typography>
          </LinkButton>
        )}
      </Typography>
      {selected.top_rating.value !== 0 && (
        <Typography>
          {messages.peak}: {Utils.displayRating(selected.top_rating.value)} (
          <PlayerDateTime value={selected.top_rating.timestamp} />)
        </Typography>
      )}
      {selected.top_defeated.value !== 0 && (
        <Typography>
          {messages.bestWin}:{" "}
          <LinkButton
            href={`/player/${selected.top_defeated.id}/${encodeURIComponent(selected.top_defeated.char_short)}`}
            sx={{ fontSize: 16 }}
          >
            {selected.top_defeated.name} ({selected.top_defeated.char_short})
          </LinkButton>{" "}
          {Utils.displayRating(selected.top_defeated.value)} (
          <PlayerDateTime value={selected.top_defeated.timestamp} />)
        </Typography>
      )}
    </>
  );
}

async function ChartSection({
  player,
  selected,
  language = "en",
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer;
  language?: Language;
}) {
  const messages = getClassicMessages(language).player;
  if (selected.match_count <= 0)
    return <Typography>{messages.noChart}</Typography>;
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
      language={language === "ja" ? "ja" : "en"}
    />
  );
}

async function MatchupSection({
  player,
  selected,
  language = "en",
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer;
  language?: Language;
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
      language={language === "ja" ? "ja" : "en"}
    />
  );
}

export function PlayerContent({
  player,
  selected,
  character,
  pagination,
  language = "en",
}: {
  player: PlayerResponse;
  selected: PlayerResponsePlayer | null;
  character?: string;
  pagination: Pagination;
  language?: Language;
}) {
  const messages = getClassicMessages(language).player;
  return (
    <>
      <AppBar
        position="static"
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >
        <Box sx={{ minHeight: { xs: 50, lg: 100 }, pt: { xs: 0, lg: "30px" } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "center",
              mt: { xs: 2, lg: 0 },
            }}
          >
            {player.tags?.length > 0 && (
              <Box sx={{ flexBasis: "100%", textAlign: "center" }}>
                {player.tags.map((tag) => (
                  <Tag key={tag.tag} style={JSON.parse(tag.style)}>
                    {tag.tag}
                  </Tag>
                ))}
              </Box>
            )}
            {selected &&
              Utils.displayRankIcon(
                selected.rating,
                "64px",
                selected.is_legend,
              )}
            <Typography
              component="h1"
              variant="playerName"
              sx={{ fontSize: 30, overflowWrap: "anywhere" }}
            >
              {player.name}
            </Typography>
            <Typography variant="platform">{player.platform}</Typography>
            {player.top_global !== 0 && (
              <LinkButton href="/top_global" sx={{ ml: 1 }}>
                <Typography variant="global_rank" component="span">
                  #{player.top_global}{" "}
                  {language === "ja" ? messages.overall : "Overall"}
                </Typography>
              </LinkButton>
            )}
          </Box>
          <Box sx={{ minHeight: 56, display: "flow-root" }}>
            <Suspense fallback={null}>
              <Aliases player={player} language={language} />
            </Suspense>
          </Box>
        </Box>
      </AppBar>
      <Box
        sx={{
          display: "grid",
          gridTemplateAreas: {
            xs: '"main" "avatar" "sidebar"',
            lg: '"main sidebar"',
          },
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            lg: "minmax(0, 1fr) 300px",
          },
          gap: { xs: 1, lg: 2 },
          p: { xs: 1, lg: 2 },
          overflow: "hidden",
        }}
      >
        <Box sx={{ gridArea: "main", minWidth: 0 }}>
          {selected && character ? (
            <>
              <CharacterStats
                player={player}
                selected={selected}
                language={language}
              />
              <PlayerAutoRefresh
                key={`${player.id}-${character}`}
                language={language === "ja" ? "ja" : "en"}
              />
              <PlayerHistory
                player={player}
                character={character}
                pagination={pagination}
                language={language}
              />
              <Suspense
                fallback={
                  <Typography>
                    {language === "ja"
                      ? messages.loadingChart
                      : "Loading rating history..."}
                  </Typography>
                }
              >
                <ChartSection
                  key={`${player.id}-${character}`}
                  player={player}
                  selected={selected}
                  language={language}
                />
              </Suspense>
              <noscript>
                <Typography>
                  {language === "ja"
                    ? "グラフの表示にはJavaScriptが必要です。レーティングと対戦履歴は上で確認できます。"
                    : "Rating charts require JavaScript. Ratings and match history are available above."}
                </Typography>
              </noscript>
              <Suspense
                key={`${player.id}-${character}-matchups`}
                fallback={
                  <>
                    <Typography>
                      {language === "ja"
                        ? messages.loadingMatchups
                        : "Loading matchup statistics..."}
                    </Typography>
                    <noscript>
                      <Typography>
                        {language === "ja"
                          ? messages.matchupsNoscript
                          : "JavaScript is needed to display streamed player matchup statistics. View"}{" "}
                        <LinkButton href="/matchup">
                          {language === "ja"
                            ? messages.matchups
                            : "character matchup statistics"}
                        </LinkButton>{" "}
                        {language === "ja" ? "" : "without JavaScript."}
                      </Typography>
                    </noscript>
                  </>
                }
              >
                <MatchupSection
                  player={player}
                  selected={selected}
                  language={language}
                />
              </Suspense>
            </>
          ) : (
            <Typography sx={{ my: 2 }}>
              {player.ratings.length
                ? messages.noCharacter
                : messages.noRatings}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            gridArea: "sidebar",
            display: { xs: "contents", lg: "flex" },
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Box
            sx={{ gridArea: { xs: "avatar", lg: "unset" }, minHeight: 326.5 }}
          >
            <Box sx={{ minHeight: 64, display: "flow-root" }}>
              <Suspense fallback={null}>
                <Comment id={player.id} />
              </Suspense>
            </Box>
            <PlayerAvatar
              key={player.id}
              playerId={player.id}
              alt={language === "ja" ? messages.avatar : "Player Avatar"}
            />
          </Box>
          <Box sx={{ gridArea: { xs: "sidebar", lg: "unset" } }}>
            <hr />
            <Typography sx={{ fontSize: 14 }}>
              {messages.characters}:
            </Typography>
            {player.ratings.map((rating) => (
              <Box key={rating.char_short}>
                <LinkButton
                  href={`/player/${player.id}/${encodeURIComponent(rating.char_short)}`}
                  sx={{ textAlign: "left", color: "white" }}
                >
                  <Box sx={{ fontSize: 12.5, my: 0.3 }}>
                    {language === "ja"
                      ? characterLabel(
                          rating.char_short,
                          rating.character,
                          language,
                        )
                      : rating.character}{" "}
                    {Utils.displayRating(rating.rating)}{" "}
                    {Utils.displayRankIcon(
                      rating.rating,
                      "32px",
                      rating.is_legend,
                    )}
                    <br />({rating.match_count} {messages.games})
                  </Box>
                </LinkButton>
              </Box>
            ))}
            <hr />
          </Box>
        </Box>
      </Box>
    </>
  );
}
