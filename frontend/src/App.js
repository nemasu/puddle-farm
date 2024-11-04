import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import React from 'react';
import { Link, Route, Routes } from "react-router-dom";
import { ReactComponent as DiscordIcon } from './images/discord-mark-white.svg';
import { ReactComponent as GitHubIcon } from './images/github-mark-white.svg';
import { ReactComponent as PatreonIcon } from './images/patreon-mark-white.svg';

import NavBar from './NavBar';
import Player from './Player';
import TopGlobal from './TopGlobal';
import TopPlayer from './TopPlayer';
import Search from './Search';
import ThemeManager from './ThemeManager';
import Settings from './Settings';
import { Typography } from '@mui/material';
import About from './About';

const App = () => {
  return (
    <React.Fragment>
      <Box sx={{minWidth: 1300}}>
        <ThemeManager>
          <CssBaseline enableColorScheme />
          <NavBar />
          <Routes>

            <Route
              exact
              path="/"
              element={<TopGlobal />}
            />

            <Route
              path="/about"
              element={<About />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
                path="/top_global/:count?/:offset?"
                element={<TopGlobal />}
            />

            <Route
                path="/top/:char_short/:count?/:offset?"
                element={<TopPlayer />}
            />

            <Route
                path="/player/:player_id/:char_short?/:count?/:offset?"
                element={<Player />}
            />

            <Route
                path="/search/:search_string/:exact?"
                element={<Search />}
            />

          </Routes>
          <Box sx={{ display: 'block', justifyContent: 'center', alignItems: 'center'}}>
            <Typography variant="h7" align="center" display={'block'}>
              Puddle Farm is an open source project. Feel free to contribute!
            </Typography>
            
            <Typography fontSize={13} align="center" display={'block'}>
              Don't worry, features are still being added!
            </Typography>
          </Box>
          <Box sx={{minHeight: 100, textAlign: 'center'}}>
            <Button component={Link} variant="link" target="_blank" to="https://github.com/nemasu/puddle-farm"><GitHubIcon style={{transform: 'scale(0.35)'}}/></Button>
            <Button component={Link} variant="link" target="_blank" to="https://discord.gg/vY4mE8exXB"><DiscordIcon style={{transform: 'scale(0.65)'}}/></Button>
            <Button component={Link} variant="link" target="_blank" to="https://patreon.com/nemasu"><PatreonIcon style={{transform: 'scale(0.65)'}}/></Button>
          </Box>
        </ThemeManager>
      </Box>
    </React.Fragment>
  );
};

export default App;