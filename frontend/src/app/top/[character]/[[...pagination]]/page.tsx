import type { Metadata } from "next";
import { PageHeading } from "../../../../components/classic/PageHeading";
import { RankingContent } from "../../../../components/classic/RankingContent";
import type { PageSearchParams } from "../../../../lib/pagination";
import { getCharacters } from "../../../../lib/server/characters";
import { resolveRankingRoute } from "../../../../lib/server/ranking-route";

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
  const name = await characterName((await params).character);
  return {
    title: `${name} Leaderboard | Guilty Gear Strive | Puddle Farm`,
    description:
      "Guilty Gear Strive character leaderboards and top player ratings.",
  };
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
  return (
    <>
      <PageHeading>{name} Leaderboard</PageHeading>
      <RankingContent pagination={pagination} character={route.character} />
    </>
  );
}
