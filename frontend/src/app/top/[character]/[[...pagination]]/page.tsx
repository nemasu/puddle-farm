import type { Metadata } from "next";
import { PageHeading } from "../../../../components/classic/PageHeading";
import { RankingContent } from "../../../../components/classic/RankingContent";
import { LadderRankingContent } from "../../../../components/ladder/RankingContent";
import { getPageCopy } from "../../../../lib/i18n/classic";
import { characterLabel } from "../../../../lib/ladder-characters";
import type { PageSearchParams } from "../../../../lib/pagination";
import { getCharacters } from "../../../../lib/server/characters";
import { resolveRankingRoute } from "../../../../lib/server/ranking-route";
import { getRequestPresentation } from "../../../../lib/server/site-preferences";
import { localizedMetadata } from "../../../../lib/server-metadata";

type Props = {
  params: Promise<{ character: string; pagination?: string[] }>;
  searchParams: Promise<PageSearchParams>;
};

async function characterName(character: string): Promise<string> {
  try {
    return (await getCharacters())[character] ?? "Character";
  } catch {
    return "Character";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const character = (await params).character;
  const name = await characterName(character);
  const presentation = await getRequestPresentation();
  return await localizedMetadata(
    getPageCopy<Metadata>(
      presentation,
      {
        title: `${name} Leaderboard | Guilty Gear Strive | Puddle Farm`,
        description:
          "Guilty Gear Strive character leaderboards and top player ratings.",
      },
      (messages) => ({
        title: `${characterLabel(character, name, presentation.language)} ${messages.ladder.characterRankings} | Puddle Farm`,
        description: messages.ladder.characterDescription,
      }),
    ),
  );
}

export default async function CharacterRankingPage({
  params,
  searchParams,
}: Props) {
  const [route, query] = await Promise.all([params, searchParams]);
  const pagination = resolveRankingRoute(
    `/top/${encodeURIComponent(route.character)}`,
    route.pagination,
    query,
  );
  const name = await characterName(route.character);
  const presentation = await getRequestPresentation();
  if (presentation.design === "ladder")
    return (
      <LadderRankingContent
        pagination={pagination}
        character={route.character}
        name={characterLabel(route.character, name, presentation.language)}
        language={presentation.language}
      />
    );
  return (
    <>
      <PageHeading>
        {presentation.language === "ja"
          ? `${characterLabel(route.character, name, "ja")} ${presentation.messages.ladder.characterRankings}`
          : `${name} Leaderboard`}
      </PageHeading>
      <RankingContent pagination={pagination} character={route.character} />
    </>
  );
}
