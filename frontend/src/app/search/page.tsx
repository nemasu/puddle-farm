import { Box, Divider } from "@mui/material";
import type { Metadata } from "next";
import { PageHeading } from "../../components/classic/PageHeading";
import { SearchOptions } from "../../components/classic/SearchOptions";
import { SearchResults } from "../../components/classic/SearchResults";
import { firstParam, type PageSearchParams } from "../../lib/pagination";

export const metadata: Metadata = {
  title: "Player Search | Guilty Gear Strive | Puddle Farm",
  description:
    "Find Guilty Gear Strive players, ratings, and match history by name.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const query = firstParam(params.q) ?? "";
  const exact = firstParam(params.exact) === "true";
  return (
    <>
      <PageHeading>Search Results</PageHeading>
      <Box component="section" sx={{ m: { xs: 1, sm: 4 } }}>
        <SearchOptions query={query} exact={exact} />
        <Divider />
        <Box sx={{ p: 1 }}>
          <SearchResults query={query} exact={exact} />
        </Box>
      </Box>
    </>
  );
}
