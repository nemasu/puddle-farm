import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import React from 'react';
import { Box, CssBaseline, useMediaQuery, useTheme, Button, Link } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
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
import Stats from './Stats';
import Popularity from './Popularity';
import Matchup from './Matchup';

const App = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <ThemeManager>
      <CssBaseline enableColorScheme />
      <NavBar />
      {isMobile ? (
        <Box sx={{ minWidth: 300, display: 'block' }}> {/* Mobile View */}
          <Routes>
            <Route exact path="/" element={<TopGlobal />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/top_global/:count?/:offset?" element={<TopGlobal />} />
            <Route path="/top/:char_short/:count?/:offset?" element={<TopPlayer />} />
            <Route path="/player/:player_id/:char_short?/:count?/:offset?" element={<Player />} />
            <Route path="/search/:search_string/:exact?" element={<Search />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/popularity" element={<Popularity />} />
            <Route path="/matchup" element={<Matchup />} />
          </Routes>
        </Box>
      ) : (
        <Box sx={{ minWidth: 1300, display: 'block' }}> {/* Desktop View */}
          <Routes>
            <Route exact path="/" element={<TopGlobal />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/top_global/:count?/:offset?" element={<TopGlobal />} />
            <Route path="/top/:char_short/:count?/:offset?" element={<TopPlayer />} />
            <Route path="/player/:player_id/:char_short?/:count?/:offset?" element={<Player />} />
            <Route path="/search/:search_string/:exact?" element={<Search />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/popularity" element={<Popularity />} />
            <Route path="/matchup" element={<Matchup />} />
          </Routes>
        </Box>
      )}
      <Box sx={{ display: 'block', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h7" align="center" display={'block'}>
          Puddle Farm is an open source project. Feel free to contribute!
        </Typography>
      </Box>
      <Box sx={{ minHeight: 100, textAlign: 'center' }}>
        <Button component={Link} variant="link" target="_blank" href="https://github.com/nemasu/puddle-farm" to="https://github.com/nemasu/puddle-farm"><GitHubIcon style={{ transform: 'scale(0.65)' }} /></Button>
        <Button component={Link} variant="link" target="_blank" href="https://discord.gg/vY4mE8exXB" to="https://discord.gg/vY4mE8exXB"><DiscordIcon style={{ transform: 'scale(0.65)' }} /></Button>
        <Button component={Link} variant="link" target="_blank" href="https://patreon.com/nemasu" to="https://patreon.com/nemasu"><PatreonIcon style={{ transform: 'scale(0.55)', position: 'relative', top: '7px' }} /></Button>
      </Box>
    </ThemeManager>
  );
};

export default App;