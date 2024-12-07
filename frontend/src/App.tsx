import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import { Box, CssBaseline, useMediaQuery, useTheme, Button, Link, Typography } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import { ReactComponent as DiscordIcon } from './images/discord-mark-white.svg';
import { ReactComponent as GitHubIcon } from './images/github-mark-white.svg';
import { ReactComponent as PatreonIcon } from './images/patreon-mark-white.svg';

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
          </Routes>
        </Box>
      )}
      <Box sx={{ display: 'block', justifyContent: 'center', alignItems: 'center' }}>
        <Typography align="center" display={'block'}>
          Puddle Farm is an open source project. Feel free to contribute!
        </Typography>
      </Box>
      <Box sx={{ minHeight: 100, textAlign: 'center' }}>
        <Button component={Link} target="_blank" href="https://github.com/nemasu/puddle-farm"><GitHubIcon style={{ transform: 'scale(0.65)' }} /></Button>
        <Button component={Link} target="_blank" href="https://discord.gg/vY4mE8exXB"><DiscordIcon style={{ transform: 'scale(0.65)' }} /></Button>
        <Button component={Link} target="_blank" href="https://patreon.com/nemasu"><PatreonIcon style={{ transform: 'scale(0.55)', position: 'relative', top: '7px' }} /></Button>
      </Box>
    </ThemeManager>
  );
};

export default App;