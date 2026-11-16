import { Box, Divider } from "@mui/material";
import type { Metadata } from "next";
import { PageHeading } from "../../components/classic/PageHeading";
import { SearchOptions } from "../../components/classic/SearchOptions";
import { SearchResults } from "../../components/classic/SearchResults";
import { LadderSearchContent } from "../../components/ladder/SearchContent";
import { getPageCopy } from "../../lib/i18n/classic";
import { firstParam, type PageSearchParams } from "../../lib/pagination";
import { getRequestPresentation } from "../../lib/server/site-preferences";

const classicMetadata: Metadata = {
  title: "Player Search | Guilty Gear Strive | Puddle Farm",
  description:
    "Find Guilty Gear Strive players, ratings, and match history by name.",
};

export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
    title: `${messages.ladder.searchTitle} | Puddle Farm`,
    description: messages.ladder.searchDescription,
  }));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const query = firstParam(params.q) ?? "";
  const exact = firstParam(params.exact) === "true";
  const presentation = await getRequestPresentation();
  if (presentation.design === "ladder")
    return (
      <LadderSearchContent
        query={query}
        exact={exact}
        language={presentation.language}
      />
    );
  return (
    <>
      <PageHeading>
        {presentation.language === "ja"
          ? presentation.messages.ladder.searchTitle
          : "Search Results"}
      </PageHeading>
      <Box component="section" sx={{ m: { xs: 1, sm: 4 } }}>
        <SearchOptions
          query={query}
          exact={exact}
          language={presentation.language}
        />
        <Divider />
        <Box sx={{ p: 1 }}>
          <SearchResults query={query} exact={exact} />
        </Box>
      </Box>
    </>
  );
}
