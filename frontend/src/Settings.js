import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, FormGroup, FormControlLabel, Switch, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { JSONParse } from 'json-with-bigint';
import { StorageUtils } from './Storage';
import { Link } from 'react-router-dom';
import Themes from './Themes';

const themes = Array.from(Themes.keys());

const Settings = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const navigate = useNavigate();

  const [key, setKey] = React.useState(null);

  //Server settings
  const [settings, setSettings] = useState({});

  //Client settings
  const [preferences, setPreferences] = useState({
    useLocalTime: false,
    disableRatingColors: false,
    //autoUpdate: false
  });

  const handleChange = (event) => {
    const newPreferences = {
      ...preferences,
      [event.target.name]: Boolean(event.target.checked) ? true : null
    };
    setPreferences(newPreferences);
    StorageUtils.savePreferences(newPreferences);
  };


  useEffect(() => {

    const fetchSettings = async () => {

      const preferences = StorageUtils.getPreferences();
      setPreferences(preferences);

      const key = StorageUtils.getApiKey();

      if (key === null) {
        return;
      }

      setKey(key);

      //Get status from backend
      const url = API_ENDPOINT
        + '/settings/'
        + key;
      const response = await fetch(url);

      if (response.status === 200) {
        const result = await response.text().then(body => {
          var parsed = JSONParse(body);
          return parsed;
        });

        setSettings(result);

        if (result.id === 0) {
          StorageUtils.removeApiKey();
          window.location.reload();
        }
      } else if (response.status === 404) {
        StorageUtils.removeApiKey();
        window.location.reload();
      }
    }

    fetchSettings();
  }, [API_ENDPOINT]);

  function toggleStatus() {
    const url = API_ENDPOINT
      + '/toggle_private/'
      + key;

    fetch(url)
      .then(response => response)
      .then(result => {
        window.location.reload();
      });
  }

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
            {/* <FormControlLabel
                sx={{my: 1}}
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
                            Automatically refresh when new matches are available.
                        </Typography>
                    </Box>
                }
            /> */}
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
      <Box m={2}>
        <Paper elevation={2} sx={{ p: 3 }}>
          {key !== null ? ( //If we have a key set
            <Box>
              <Box sx={{ marginBottom: 2 }}>
                <Button
                  variant='link'
                  gutterBottom
                  sx={{ fontSize: '1rem' }}
                  onClick={() => navigate(`/player/${settings.id}`)}
                >
                  {settings.name}
                </Button>
                's Settings
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.status === 'Hidden'}
                    onChange={toggleStatus}
                    name="status"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Private Profile</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hide your profile from the public.
                    </Typography>
                  </Box>
                }
              />
              <Box sx={{ borderColor: '#F8B552', borderWidth: '2px', borderStyle: 'dashed', p: '20px', m: '50px' }}>
                <Typography variant='body1'>Note: If you use the same browser, you can revisit this page without reauthenticating to change settings.</Typography>
                <Typography variant='body1'>If you don't want that, click <Button onClick={() => { StorageUtils.removeApiKey(); window.location.reload(); }}>here</Button> to clear browser data.</Typography>
              </Box>
            </Box>

          ) : (//If we don't have a key set
            <Box>
              <Typography variant="h6">
                Use "claim profile" feature to access player settings like hide profile.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </React.Fragment>
  );
};

export default Settings;