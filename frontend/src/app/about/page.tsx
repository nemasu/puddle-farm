import { Box, Link, Typography } from "@mui/material";
import type { Metadata } from "next";
import { Credits } from "../../components/Credits";
import { LoadFailure } from "../../components/classic/LoadFailure";
import { PlayerLink } from "../../components/classic/PlayerLink";
import { LadderAboutContent } from "../../components/ladder/AboutContent";
import { Tag } from "../../components/Tag";
import type { Supporter } from "../../interfaces/API";
import { getPageCopy } from "../../lib/i18n/classic";
import { readJson } from "../../lib/server/api";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { localizedMetadata } from "../../lib/server-metadata";

const classicMetadata: Metadata = {
  title: "About | Guilty Gear Strive | Puddle Farm",
  description: "How Puddle Farm tracks Guilty Gear Strive ratings and matches.",
};
export async function generateMetadata(): Promise<Metadata> {
  const presentation = await getRequestPresentation();
  return await localizedMetadata(
    getPageCopy<Metadata>(presentation, classicMetadata, (messages) => ({
      title: `${messages.about.title} | Puddle Farm`,
      description: messages.about.description,
    })),
  );
}
export default async function AboutPage() {
  const presentation = await getRequestPresentation();
  const japanese = presentation.language === "ja";
  const messages = presentation.messages.about;
  let supporters: Supporter[] | null;
  try {
    supporters = await readJson<Supporter[]>("/supporters");
  } catch {
    supporters = null;
  }
  if (presentation.design === "ladder")
    return (
      <LadderAboutContent
        supporters={supporters}
        language={presentation.language}
      />
    );
  return (
    <Box sx={{ m: 5 }}>
      <Typography component="h1" variant="h4" gutterBottom align="center">
        {japanese ? messages.title : "About"}
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          {japanese ? messages.what : "What is this?"}
        </Typography>
        <Typography variant="body1">
          {japanese ? (
            `${messages.whatText} ${messages.disclaimer}`
          ) : (
            <>
              This website collects replay data for the game{" "}
              <Link href="https://www.guiltygear.com/ggst/en/" target="_blank">
                Guilty Gear Strive
              </Link>{" "}
              and provides statistics and rankings using the game's official
              rating system.
              <br />
              It is not affiliated with Arc System Works or any other company.
            </>
          )}
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          {japanese ? messages.rating : "What rating system is used?"}
        </Typography>
        <Typography variant="body1">
          {japanese ? (
            messages.ratingText
          ) : (
            <>
              This site uses the official rating system provided by Guilty Gear
              Strive.
              <br />
            </>
          )}
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          {japanese ? messages.sync : "Rating Sync"}
        </Typography>
        <Typography variant="body1">
          {japanese ? (
            `${messages.syncText} ${messages.syncLimit}`
          ) : (
            <>
              Rating Sync fetches your current rating from the game.
              <br />
              Look for the refresh icon (🔄) next to your rating on your player
              page.
              <br />
              It's recommended to use this feature after you're done for the day
              to ensure your rating is up to date.
              <br />
              <strong>Note:</strong> Rating sync is limited to once per minute.
            </>
          )}
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          {japanese ? messages.contact : "I have a suggestion/question."}
        </Typography>
        <Typography variant="body1">
          {japanese ? (
            messages.contactText
          ) : (
            <>Feel free to join Discord. The link is in the footer.</>
          )}
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          {japanese ? messages.supporters : "Supporters 💜"}
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: 1 }}>
          {japanese
            ? messages.thanks
            : "Big thank you to the Patreon subscribers for supporting the website"}
        </Typography>
        <Typography variant="body1" component="div">
          {supporters === null ? (
            <LoadFailure subject="supporters" />
          ) : (
            <ul>
              {supporters.map((supporter) => (
                <li key={supporter.id}>
                  <PlayerLink playerId={supporter.id}>
                    {supporter.name}
                  </PlayerLink>
                  {supporter.tags?.map((tag) => (
                    <Tag
                      key={tag.tag}
                      style={JSON.parse(tag.style)}
                      sx={{ fontSize: "0.9rem", position: "unset" }}
                    >
                      {tag.tag}
                    </Tag>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }} component="section" aria-labelledby="credits-title">
        <Typography
          id="credits-title"
          variant="h5"
          component="h2"
          sx={{ fontWeight: "bold", marginBottom: 1 }}
        >
          {messages.credits}
        </Typography>
        <Credits language={presentation.language} />
      </Box>
    </Box>
  );
}
