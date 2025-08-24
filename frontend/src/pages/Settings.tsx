import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, FormGroup, FormControlLabel, Switch, Paper, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { StorageOptions, StorageUtils } from './../utils/Storage';
import Themes from './../utils/Themes';
import { SettingsResponse } from '../interfaces/API';
import { JSONParse } from '../utils/JSONParse';

const themes = Array.from(Themes.keys());

const Settings = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  //Server settings
  const [settings, setSettings] = useState<SettingsResponse>();

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
    document.title = 'Settings | Puddle Farm';

    const fetchSettings = async () => {

      const preferences = StorageUtils.getPreferences();
      setPreferences(preferences);
    }

    fetchSettings();
  }, [API_ENDPOINT]);

  return (
    <React.Fragment>
      <Box m={2}>
        <Paper elevation={2} sx={{ p: 3, my: 1 }}>
          <Typography variant="h6" gutterBottom>
            Display Settings
          </Typography>
          <FormGroup>
            <FormControlLabel
              sx={{ my: 1 }}
              control={
                <Switch
                  checked={preferences.useLocalTime ? true : false}
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
                  checked={preferences.disableRatingColors ? true : false}
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
                  checked={preferences.autoUpdate ? true : false}
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
    </React.Fragment>
  );
};

export default Settings;