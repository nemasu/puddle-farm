import { Typography } from "@mui/material";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PlayerContent } from "../../../../components/classic/PlayerContent";
import { LadderPlayerContent } from "../../../../components/ladder/PlayerContent";
import { getPageCopy } from "../../../../lib/i18n/classic";
import { parsePlayerRoute } from "../../../../lib/player";
import { ApiError } from "../../../../lib/server/api";
import { getPlayer } from "../../../../lib/server/player";
import { getRequestPresentation } from "../../../../lib/server/site-preferences";
import {
  findCharData,
  findHighestRatedChar,
  isEmptyPlayer,
} from "../../../../utils/playerUtils";

type Props = { params: Promise<{ id: string; segments?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const route = await params;
  const parsed = parsePlayerRoute(route.id, route.segments);
  const presentation = await getRequestPresentation();
  const base = {
    title: getPageCopy(
      presentation,
      "Player | Guilty Gear Strive | Puddle Farm",
      (messages) =>
        `${messages.player.title} | Guilty Gear Strive | Puddle Farm`,
    ),
    description: presentation.messages.player.description,
  };
  if (!parsed) return base;
  try {
    const player = await getPlayer(parsed.id);
    const character = parsed.character;
    const selected = character ? findCharData(player.ratings, character) : null;
    return {
      ...base,
      title: `${player.name}${selected ? ` (${character}) - ${selected.rating > 10000000 ? `${selected.rating - 10000000} DR` : `${selected.rating} RP`}` : ""} | Guilty Gear Strive | Puddle Farm`,
    };
  } catch {
    return base;
  }
}

export default async function PlayerPage({ params }: Props) {
  const route = await params;
  const parsed = parsePlayerRoute(route.id, route.segments);
  if (!parsed) notFound();
  const { id, character, pagination } = parsed;
  const presentation = await getRequestPresentation();
  let player: Awaited<ReturnType<typeof getPlayer>>;
  try {
    player = await getPlayer(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    console.error("Could not load player:", error);
    return (
      <Typography role="alert" color="error" sx={{ m: 3 }}>
        {getPageCopy(
          presentation,
          "Could not load this player. Please try again later.",
          (messages) => messages.player.error,
        )}
      </Typography>
    );
  }
  if (isEmptyPlayer(player)) notFound();
  if (!character && player.ratings.length)
    redirect(`/player/${id}/${findHighestRatedChar(player.ratings)}`);
  const selected = character ? findCharData(player.ratings, character) : null;
  if (presentation.design === "ladder")
    return (
      <LadderPlayerContent
        player={player}
        selected={selected}
        character={character}
        pagination={pagination}
        language={presentation.language}
      />
    );
  return (
    <PlayerContent
      player={player}
      selected={selected}
      character={character}
      pagination={pagination}
      language={presentation.language}
    />
  );
}
