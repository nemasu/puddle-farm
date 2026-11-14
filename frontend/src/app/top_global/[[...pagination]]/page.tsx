import type { Metadata } from "next";
import { PageHeading } from "../../../components/classic/PageHeading";
import { RankingContent } from "../../../components/classic/RankingContent";
import type { PageSearchParams } from "../../../lib/pagination";
import { resolveRankingRoute } from "../../../lib/server/ranking-route";

export const metadata: Metadata = {
  title: "Global Leaderboard | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive global player rankings and ratings.",
};

export default async function GlobalRankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ pagination?: string[] }>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [route, query] = await Promise.all([params, searchParams]);
  const pagination = resolveRankingRoute(
    "/top_global",
    route.pagination,
    query,
  );
  return (
    <>
      <PageHeading>Top Players</PageHeading>
      <RankingContent pagination={pagination} />
    </>
  );
}
