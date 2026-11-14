import { Box, Typography } from "@mui/material";
import { getLegendRanking } from "../../lib/server/rankings";
import { PageHeading } from "./PageHeading";
import { RankingTable } from "./RankingTable";
import { UpdateCountdown } from "./UpdateCountdown";

export async function LegendContent() {
  let result: Awaited<ReturnType<typeof getLegendRanking>> | null = null;
  try {
    result = await getLegendRanking();
  } catch (error) {
    console.error("Could not load the Legend leaderboard:", error);
  }

  return (
    <>
      <PageHeading>GGST Legend Leaderboard</PageHeading>
      <Box sx={{ m: { xs: 1, sm: 3 } }}>
        <Typography sx={{ mb: 2 }}>
          Guilty Gear Strive player ratings and match history.
        </Typography>
        {!result && (
          <Typography role="alert" color="error" align="center" sx={{ mb: 2 }}>
            Could not load the leaderboard. Please try again later.
          </Typography>
        )}
        {result?.lastUpdateMs != null && (
          <UpdateCountdown
            updateAt={result.lastUpdateMs + 3_600_000}
            renderedAt={Date.now()}
          />
        )}
        {result && <RankingTable ranks={result.ranks} legend />}
      </Box>
    </>
  );
}
