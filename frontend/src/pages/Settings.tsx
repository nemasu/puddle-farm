import {
  Box,
  Button,
  FormControlLabel,
  FormGroup,
  Paper,
  Switch,
  Typography,
} from "@mui/material";
import type React from "react";
import { useEffect, useState } from "react";
import type { SettingsResponse } from "../interfaces/API";
import { type StorageOptions, StorageUtils } from "./../utils/Storage";
import Themes from "./../utils/Themes";

const themes = Array.from(Themes.keys());

const Settings = () => {
  const _API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

  //Server settings
  const [_settings, _setSettings] = useState<SettingsResponse>();

  // Client settings
  const [preferences, setPreferences] = useState<StorageOptions>({
    useLocalTime: null,
    disableRatingColors: null,
    autoUpdate: null,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, checked } = event.target;
    const newPreferences: StorageOptions = {
      ...preferences,
      [name]: checked ? true : null,
    };
    setPreferences(newPreferences);
    StorageUtils.savePreferences(newPreferences);
  };

  useEffect(() => {
    document.title = "Settings | Puddle Farm";

    const fetchSettings = async () => {
      const preferences = StorageUtils.getPreferences();
      setPreferences(preferences);
    };

    fetchSettings();
  }, []);

  return (
    <Box sx={{ m: 2 }}>
      <Paper elevation={2} sx={{ p: 3, my: 1 }}>
        <Typography variant="h6" gutterBottom>
          Display Settings
        </Typography>
        <FormGroup>
          <FormControlLabel
            sx={{ my: 1 }}
            control={
              <Switch
                checked={!!preferences.useLocalTime}
                onChange={handleChange}
                name="useLocalTime"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Local Time</Typography>
                <Typography variant="caption" color="text.secondary">
                  Display timestamps in your local timezone instead of UTC
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            sx={{ my: 1 }}
            control={
              <Switch
                checked={!!preferences.disableRatingColors}
                onChange={handleChange}
                name="disableRatingColors"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Plain Rating Change</Typography>
                <Typography variant="caption" color="text.secondary">
                  Disable color for rating changes
                </Typography>
              </Box>
            }
          />
          <FormControlLabel
            sx={{ my: 1 }}
            control={
              <Switch
                checked={!!preferences.autoUpdate}
                onChange={handleChange}
                name="autoUpdate"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Auto Update</Typography>
                <Typography variant="caption" color="text.secondary">
                  Refresh player page once per minute.
                </Typography>
              </Box>
            }
          />
        </FormGroup>
      </Paper>
      <Paper elevation={2} sx={{ p: 3, my: 1 }}>
        <Typography variant="h6" gutterBottom>
          Themes
        </Typography>
        <Box>
          {themes.map((theme) => (
            <Button
              key={theme}
              variant="outlined"
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
      </Paper>
    </Box>
  );
};

export default Settings;
