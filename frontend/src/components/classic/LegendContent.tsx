import { Box, Typography } from "@mui/material";
import { getClassicMessages } from "../../lib/i18n/classic";
import { getLegendRanking } from "../../lib/server/rankings";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { PageHeading } from "./PageHeading";
import { RankingTable } from "./RankingTable";
import { UpdateCountdown } from "./UpdateCountdown";

export async function LegendContent() {
  const { language } = await getRequestPresentation();
  const messages = getClassicMessages(language);
  let result: Awaited<ReturnType<typeof getLegendRanking>> | null = null;
  try {
    result = await getLegendRanking();
  } catch (error) {
    console.error("Could not load the Legend leaderboard:", error);
  }

  return (
    <>
      <PageHeading>
        {language === "ja"
          ? messages.ladder.leaderboard
          : "GGST Legend Leaderboard"}
      </PageHeading>
      <Box sx={{ m: { xs: 1, sm: 3 } }}>
        <Typography sx={{ mb: 2 }}>
          {language === "ja"
            ? messages.player.description
            : "Guilty Gear Strive player ratings and match history."}
        </Typography>
        {!result && (
          <Typography role="alert" color="error" align="center" sx={{ mb: 2 }}>
            {messages.ladder.error}
          </Typography>
        )}
        {result?.lastUpdateMs != null && (
          <UpdateCountdown
            updateAt={result.lastUpdateMs + 3_600_000}
            renderedAt={Date.now()}
            label={messages.ladder.nextUpdate}
            updating={messages.ladder.updating}
          />
        )}
        {result && <RankingTable ranks={result.ranks} legend />}
      </Box>
    </>
  );
}
