import { Box, Paper, Typography } from "@mui/material";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  DisplaySettingsControls,
  ThemeControls,
} from "../../components/classic/SettingsControls";
import { SiteSettings } from "../../components/classic/SiteSettings";
import { SettingsPresentation } from "../../components/ladder/SettingsPresentation";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { THEME_COOKIE } from "../../lib/theme-preference";
import { SettingsExtras } from "../../site";

export async function generateMetadata(): Promise<Metadata> {
  const { messages } = await getRequestPresentation();
  return {
    title: `${messages.settings.title} | Puddle Farm`,
    description: messages.settings.description,
  };
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
