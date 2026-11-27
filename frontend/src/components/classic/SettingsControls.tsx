"use client";

import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Typography,
} from "@mui/material";
import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { usePreferencesContext } from "../DisplayPreferences";

export function DisplaySettingsControls({
  language = "en",
}: {
  language?: Language;
}) {
  const messages = getMessages(language).settings;
  const context = usePreferencesContext();
  if (!context) return null;
  return (
    <FormGroup>
      {[
        ["useLocalTime", messages.localTime, messages.localTimeDescription],
        [
          "disableRatingColors",
          messages.plainRatings,
          messages.plainRatingsDescription,
        ],
        ["autoUpdate", messages.autoUpdate, messages.autoUpdateDescription],
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
