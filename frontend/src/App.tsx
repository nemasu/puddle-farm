import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { Box, CssBaseline, useMediaQuery, useTheme, Button, Link, Typography } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import DiscordIcon from './images/discord-mark-white.svg?react';
import GitHubIcon from './images/github-mark-white.svg?react';
import PatreonIcon from './images/patreon-mark-white.svg?react';

import NavBar from './components/NavBar';
import Player from './pages/Player';
import TopGlobal from './pages/TopGlobal';
import ThemeManager from './components/ThemeManager';
import About from './pages/About';
import Settings from './pages/Settings';
import Search from './pages/Search';
import TopPlayer from './pages/TopPlayer';
import Stats from './pages/Stats';
import Popularity from './pages/Popularity';
import Matchup from './pages/Matchup';
import Distribution from './pages/Distribution';
import Terms from './pages/Terms';

const App = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <ThemeManager>
      <CssBaseline enableColorScheme />
      <NavBar />
      {isMobile ? (
        <Box sx={{ display: 'block' }}> {/* Mobile View */}
          <Routes>
            <Route path="/" element={<TopGlobal />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/top_global/:count?/:offset?" element={<TopGlobal />} />
            <Route path="/top/:char_short/:count?/:offset?" element={<TopPlayer />} />
            <Route path="/player/:player_id/:char_short?/:count?/:offset?" element={<Player />} />
            <Route path="/search/:search_string/:exact?" element={<Search />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/popularity" element={<Popularity />} />
            <Route path="/matchup" element={<Matchup />} />
            <Route path="/distribution" element={<Distribution />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<TopGlobal />} />
          </Routes>
        </Box>
      ) : (
        <Box sx={{ display: 'block' }}> {/* Desktop View */}
          <Routes>
          <Route path="/" element={<TopGlobal />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/top_global/:count?/:offset?" element={<TopGlobal />} />
            <Route path="/top/:char_short/:count?/:offset?" element={<TopPlayer />} />
            <Route path="/player/:player_id/:char_short?/:count?/:offset?" element={<Player />} />
            <Route path="/search/:search_string/:exact?" element={<Search />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/popularity" element={<Popularity />} />
            <Route path="/matchup" element={<Matchup />} />
            <Route path="/distribution" element={<Distribution />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<TopGlobal />} />
          </Routes>
        </Box>
      )}
      <Box sx={{ display: 'block', justifyContent: 'center', alignItems: 'center' }}>
        <Typography align="center" display={'block'}>
          Puddle Farm is an open source project. Feel free to contribute!
        </Typography>
      </Box>
      <Box sx={{ minHeight: 100, textAlign: 'center' }}>
        <Button component={Link} target="_blank" href="https://github.com/nemasu/puddle-farm">
          <GitHubIcon style={{ width: 24, height: 24, transform: 'scale(1.3)' }} />
        </Button>
        <Button component={Link} target="_blank" href="https://discord.gg/vY4mE8exXB">
          <DiscordIcon style={{ width: 24, height: 24, transform: 'scale(1.3)' }} />
        </Button>
        <Button component={Link} target="_blank" href="https://patreon.com/nemasu">
          <PatreonIcon style={{ width: 24, height: 24, transform: 'scale(1.1)' }} />
        </Button>
      </Box>
      <Box sx={{ minHeight: 100, textAlign: 'center' }}>
        <Button component={Link} href="/terms">Terms & Privacy</Button>
      </Box>

      <Box sx={{ textAlign: 'center', pb: 2, fontSize: '0.75rem', color: 'text.secondary' }}>
        This site is not endorsed by or affiliated with Arc System Works.
      </Box>
    </ThemeManager>
  );
};

export default App;