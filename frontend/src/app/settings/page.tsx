import { Box, Paper, Typography } from "@mui/material";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  DisplaySettingsControls,
  ThemeControls,
} from "../../components/classic/SettingsControls";
import { THEME_COOKIE } from "../../lib/theme-preference";
import { SettingsExtras } from "../../site";

export const metadata: Metadata = {
  title: "Settings | Puddle Farm",
  description: "Preferences for the Guilty Gear Strive tracker.",
};

export default async function SettingsPage() {
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <Box sx={{ m: 2 }}>
      <Paper elevation={2} sx={{ p: 3, my: 1 }}>
        <Typography component="h1" variant="h6" gutterBottom>
          Display Settings
        </Typography>
        <DisplaySettingsControls />
      </Paper>
      <Paper elevation={2} sx={{ p: 3, my: 1 }}>
        <Typography variant="h6" gutterBottom>
          Themes
        </Typography>
        <ThemeControls initialTheme={theme} />
      </Paper>
      <SettingsExtras />
    </Box>
  );
}
