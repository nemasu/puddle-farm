import type { Metadata } from "next";
import { PageHeading } from "../../../components/classic/PageHeading";
import { RankingContent } from "../../../components/classic/RankingContent";
import { LadderRankingContent } from "../../../components/ladder/RankingContent";
import { getPageCopy } from "../../../lib/i18n/classic";
import type { PageSearchParams } from "../../../lib/pagination";
import { resolveRankingRoute } from "../../../lib/server/ranking-route";
import { getRequestPresentation } from "../../../lib/server/site-preferences";

const classicMetadata: Metadata = {
  title: "Global Leaderboard | Guilty Gear Strive | Puddle Farm",
  description: "Guilty Gear Strive global player rankings and ratings.",
};

export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
    title: `${messages.ladder.globalTitle} | Puddle Farm`,
    description: messages.ladder.globalDescription,
  }));
}

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
  const presentation = await getRequestPresentation();
  if (presentation.design === "ladder")
    return (
      <LadderRankingContent
        pagination={pagination}
        language={presentation.language}
      />
    );
  return (
    <>
      <PageHeading>
        {presentation.language === "ja"
          ? presentation.messages.ladder.globalTitle
          : "Top Players"}
      </PageHeading>
      <RankingContent pagination={pagination} />
    </>
  );
}
