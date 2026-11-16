import { Box, Typography } from "@mui/material";
import { redirect } from "next/navigation";
import { getClassicMessages } from "../../lib/i18n/classic";
import type { Pagination } from "../../lib/pagination";
import { computeShowNext } from "../../lib/rankings";
import { ApiError } from "../../lib/server/api";
import { getRanking } from "../../lib/server/rankings";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { ONE_DAY_MS } from "../../utils/time";
import { RankingPagination } from "./RankingPagination";
import { RankingTable } from "./RankingTable";
import { UpdateCountdown } from "./UpdateCountdown";

export async function RankingContent({
  pagination,
  character,
}: {
  pagination: Pagination;
  character?: string;
}) {
  const { language } = await getRequestPresentation();
  const messages = getClassicMessages(language);
  let result: Awaited<ReturnType<typeof getRanking>>;
  try {
    result = await getRanking(pagination, character);
  } catch (error) {
    // Unknown characters redirect to Legend.
    if (error instanceof ApiError && error.status === 404) redirect("/");
    console.error("Could not load the leaderboard:", error);
    return (
      <Typography role="alert" color="error" align="center" sx={{ m: 3 }}>
        {messages.ladder.error}
      </Typography>
    );
  }
  const base = character
    ? `/top/${encodeURIComponent(character)}`
    : "/top_global";
  const paginationProps = {
    base,
    pagination,
    showNext: computeShowNext(result.ranks.length, pagination.count),
  };
  return (
    <Box sx={{ m: { xs: 1, sm: character ? 4 : 3 } }}>
      {result.lastUpdateMs !== null && (
        <UpdateCountdown
          includeHours
          updateAt={result.lastUpdateMs + ONE_DAY_MS}
          renderedAt={Date.now()}
          label={messages.ladder.nextUpdate}
          updating={messages.ladder.updating}
        />
      )}
      <RankingPagination {...paginationProps} position="top" />
      <RankingTable ranks={result.ranks} />
      <RankingPagination {...paginationProps} position="bottom" />
    </Box>
  );
}
