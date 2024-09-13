import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';
import React from 'react';
import { Link, Route, Routes } from "react-router-dom";
import { ReactComponent as DiscordIcon } from './images/discord-mark-white.svg';
import { ReactComponent as GitHubIcon } from './images/github-mark-white.svg';

import NavBar from './NavBar';
import Player from './Player';
import TopGlobal from './TopGlobal';
import TopPlayer from './TopPlayer';
import ThemeManager from './ThemeManager';

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
                path="/top_global/:count?/:offset?"
                element={<TopGlobal />}
            />

            <Route
                path="/top/:char_short/:count?/:offset?"
                element={<TopPlayer />}
            />

            <Route
                path="/player/:player_id/:char_short/:count?/:offset?"
                element={<Player />}
            />

          </Routes>
          <Box sx={{minHeight: 200, textAlign: 'center'}}>
            <Box sx={{marginTop: 10}}/>
            <Button component={Link} variant="link" target="_blank" to="https://github.com/nemasu/puddle-farm"><GitHubIcon style={{transform: 'scale(0.35)'}}/></Button>
            <Button component={Link} variant="link" target="_blank" to="https://discord.gg/vY4mE8exXB"><DiscordIcon/></Button>
          </Box>
        </ThemeManager>
      </Box>
    </React.Fragment>
  );
};

export default App;