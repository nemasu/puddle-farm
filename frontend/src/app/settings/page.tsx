import { Box, Button, Paper, Typography } from "@mui/material";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DisplaySettingsControls } from "../../components/classic/SettingsControls";
import {
  SiteSettings,
  ThemeControls,
} from "../../components/classic/SiteSettings";
import { SettingsPresentation } from "../../components/ladder/SettingsPresentation";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { localizedMetadata } from "../../lib/server-metadata";
import { LADDER_THEMES } from "../../lib/site-preferences";
import { THEME_COOKIE } from "../../lib/theme-preference";
import { SettingsExtras } from "../../site";
import { saveLadderTheme } from "../actions/site-preferences";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getRequestPresentation();
  return await localizedMetadata({
    title: `${messages.settings.title} | Puddle Farm`,
    description: messages.settings.description,
  });
}

export default async function SettingsPage() {
  const presentation = await getRequestPresentation();
  const { messages } = presentation;
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <SettingsPresentation
      language={presentation.language}
      design={presentation.design}
    >
      <Box sx={{ m: 2 }}>
        <Paper elevation={2} sx={{ p: 3, my: 1 }}>
          <Typography component="h1" variant="h6" gutterBottom>
            {messages.settings.presentation}
          </Typography>
          <SiteSettings preferences={presentation} />
        </Paper>
        <Paper elevation={2} sx={{ p: 3, my: 1 }}>
          <Typography component="h2" variant="h6" gutterBottom>
            {messages.settings.display}
          </Typography>
          <DisplaySettingsControls language={presentation.language} />
        </Paper>
        <Paper elevation={2} sx={{ p: 3, my: 1 }}>
          <Typography
            id="ladder-theme-title"
            component="h2"
            variant="h6"
            gutterBottom
          >
            {messages.settings.ladderTheme}
          </Typography>
          <Box
            component="form"
            action={saveLadderTheme}
            aria-labelledby="ladder-theme-title"
            sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}
          >
            {LADDER_THEMES.map((option) => (
              <Button
                key={option}
                type="submit"
                name="ladderTheme"
                value={option}
                aria-pressed={presentation.ladderTheme === option}
                variant={
                  presentation.ladderTheme === option ? "contained" : "outlined"
                }
              >
                {messages.settings[`ladderTheme_${option}`]}
              </Button>
            ))}
          </Box>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, my: 1 }}>
          <Typography component="h2" variant="h6" gutterBottom>
            {messages.settings.themes}
          </Typography>
          <ThemeControls initialTheme={theme} />
        </Paper>
        <SettingsExtras />
      </Box>
    </SettingsPresentation>
  );
}
