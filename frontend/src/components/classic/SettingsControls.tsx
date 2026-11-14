"use client";

import {
  Box,
  Button,
  FormControlLabel,
  FormGroup,
  Switch,
  Typography,
} from "@mui/material";
import { StorageUtils } from "../../utils/storage";
import {
  characterNames,
  defaultCharacterName,
  isCharacterName,
} from "../../utils/themes";
import { usePreferencesContext } from "../DisplayPreferences";

export function DisplaySettingsControls() {
  const context = usePreferencesContext();
  if (!context) return null;
  return (
    <FormGroup>
      {[
        [
          "useLocalTime",
          "Local Time",
          "Display timestamps in your local timezone instead of UTC",
        ],
        [
          "disableRatingColors",
          "Plain Rating Change",
          "Disable color for rating changes",
        ],
        ["autoUpdate", "Auto Update", "Refresh player page every 120 seconds."],
      ].map(([key, label, description]) => (
        <FormControlLabel
          key={key}
          sx={{ my: 1 }}
          control={
            <Switch
              name={key}
              checked={
                context.preferences[
                  key as "useLocalTime" | "disableRatingColors" | "autoUpdate"
                ]
              }
              onChange={(event) =>
                context.updatePreferences({ [key]: event.target.checked })
              }
            />
          }
          label={
            <Box>
              <Typography>{label}</Typography>
              <Typography variant="caption" color="text.secondary">
                {description}
              </Typography>
            </Box>
          }
        />
      ))}
    </FormGroup>
  );
}

export function ThemeControls({ initialTheme }: { initialTheme?: string }) {
  return (
    <Box>
      {characterNames.map((theme) => (
        <Button
          key={theme}
          variant="outlined"
          aria-pressed={
            theme ===
            (initialTheme && isCharacterName(initialTheme)
              ? initialTheme
              : defaultCharacterName)
          }
          sx={{ m: 1 }}
          onClick={() => {
            StorageUtils.setTheme(theme);
            window.location.reload();
          }}
        >
          {theme}
        </Button>
      ))}
    </Box>
  );
}
