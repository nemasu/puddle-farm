import { Box, Link, Typography } from "@mui/material";
import type { Metadata } from "next";
import { LinkButton } from "../../components/classic/LinkButton";
import { LoadFailure } from "../../components/classic/LoadFailure";
import { Tag } from "../../components/Tag";
import type { Supporter } from "../../interfaces/API";
import { readJson } from "../../lib/server/api";
export const metadata: Metadata = {
  title: "About | Guilty Gear Strive | Puddle Farm",
  description: "How Puddle Farm tracks Guilty Gear Strive ratings and matches.",
};
export default async function AboutPage() {
  let supporters: Supporter[] | null;
  try {
    supporters = await readJson<Supporter[]>("/supporters");
  } catch {
    supporters = null;
  }
  return (
    <Box sx={{ m: 5 }}>
      <Typography component="h1" variant="h4" gutterBottom align="center">
        About
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          What is this?
        </Typography>
        <Typography variant="body1">
          This website collects replay data for the game{" "}
          <Link href="https://www.guiltygear.com/en/" target="_blank">
            Guilty Gear Strive
          </Link>{" "}
          and provides statistics and rankings using the game's official rating
          system.
          <br />
          It is not affiliated with Arc System Works or any other company.
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          What rating system is used?
        </Typography>
        <Typography variant="body1">
          This site uses the official rating system provided by Guilty Gear
          Strive.
          <br />
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          Rating Sync
        </Typography>
        <Typography variant="body1">
          Rating Sync fetches your current rating from the game.
          <br />
          Look for the refresh icon (🔄) next to your rating on your player
          page.
          <br />
          It's recommended to use this feature after you're done for the day to
          ensure your rating is up to date.
          <br />
          <strong>Note:</strong> Rating sync is limited to once per minute.
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          I have a suggestion/question.
        </Typography>
        <Typography variant="body1">
          Feel free to join Discord. The link is in the footer.
        </Typography>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          Supporters 💜
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: 1 }}>
          Big thank you to the Patreon subscribers for supporting the website
        </Typography>
        <Typography variant="body1" component="div">
          {supporters === null ? (
            <LoadFailure subject="supporters" />
          ) : (
            <ul>
              {supporters.map((supporter) => (
                <li key={supporter.id}>
                  <LinkButton
                    href={`/player/${supporter.id}`}
                    sx={{ fontSize: 16 }}
                  >
                    {supporter.name}
                  </LinkButton>
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
    </Box>
  );
}
