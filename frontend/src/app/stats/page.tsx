import { Box, Typography } from "@mui/material";
import type { Metadata } from "next";
import { LoadFailure } from "../../components/classic/LoadFailure";
import { PageHeading } from "../../components/classic/PageHeading";
import { StatsTables } from "../../components/classic/StatsTables";
import HourlyPlayersChart from "../../components/HourlyPlayersChart";
import { LadderStatsContent } from "../../components/ladder/StatsContent";
import type {
  HourlyPlayersResponse,
  StatsResponse,
} from "../../interfaces/API";
import { getPageCopy } from "../../lib/i18n/classic";
import { readApiResponse, readJson } from "../../lib/server/api";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { localizedMetadata } from "../../lib/server-metadata";

const classicMetadata: Metadata = {
  title: "Ranked Statistics | Guilty Gear Strive | Puddle Farm",
  description:
    "Guilty Gear Strive ranked match statistics and player activity.",
};

export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return await localizedMetadata(
    getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
      title: `${messages.stats.title} | Puddle Farm`,
      description: messages.stats.description,
    })),
  );
}

export default async function StatsPage() {
  const { design, language, messages } = await getRequestPresentation();
  if (design === "ladder") return <LadderStatsContent language={language} />;
  const [stats, hourly, health] = await Promise.all([
    readJson<StatsResponse>("/stats").catch(() => null),
    readJson<HourlyPlayersResponse>("/stats/hourly-players?range=30d").catch(
      () => null,
    ),
    readApiResponse("/ingestion/health").catch(() => null),
  ]);
  return (
    <>
      <PageHeading>
        {language === "ja" ? messages.stats.title : "Stats"}
      </PageHeading>
      <HourlyPlayersChart
        initialPoints={hourly?.points ?? null}
        language={language === "ja" ? "ja" : "en"}
      />
      {stats ? (
        <StatsTables data={stats} language={language} />
      ) : (
        <LoadFailure subject="ranked statistics" />
      )}
      <Box sx={{ m: 4 }}>
        <Typography>
          {language === "ja" ? messages.stats.health : "Match updates"}:{" "}
          {health?.body || messages.common.ingestionError}
        </Typography>
      </Box>
    </>
  );
}
