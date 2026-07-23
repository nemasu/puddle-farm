import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import { Box, Button, CssBaseline, Link, Typography } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import ThemeManager from "./components/ThemeManager";
import DiscordIcon from "./images/discord-mark-white.svg?react";
import GitHubIcon from "./images/github-mark-white.svg?react";
import PatreonIcon from "./images/patreon-mark-white.svg?react";
import About from "./pages/About";
import Distribution from "./pages/Distribution";
import Legend from "./pages/Legend";
import Matchup from "./pages/Matchup";
import Player from "./pages/Player";
import Popularity from "./pages/Popularity";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Stats from "./pages/Stats";
import Terms from "./pages/Terms";
import TopGlobal from "./pages/TopGlobal";
import TopPlayer from "./pages/TopPlayer";

const App = () => {
  return (
    <ThemeManager>
      <CssBaseline enableColorScheme />
      <NavBar />
      <Box sx={{ display: "block" }}>
        <Routes>
          <Route path="/" element={<Legend />} />
          <Route path="/about" element={<About />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/top_global/:count?/:offset?" element={<TopGlobal />} />
          <Route
            path="/top/:char_short/:count?/:offset?"
            element={<TopPlayer />}
          />
          <Route
            path="/player/:player_id/:char_short?/:count?/:offset?"
            element={<Player />}
          />
          <Route path="/search" element={<Search />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/popularity" element={<Popularity />} />
          <Route path="/matchup" element={<Matchup />} />
          <Route path="/distribution" element={<Distribution />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/legend" element={<Legend />} />
          <Route path="*" element={<Legend />} />
        </Routes>
      </Box>
      <Box
        sx={{
          display: "block",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography align="center" sx={{ display: "block" }}>
          Puddle Farm is an open source project. Feel free to contribute!
        </Typography>
      </Box>
      <Box sx={{ minHeight: 100, textAlign: "center" }}>
        <Button
          component={Link}
          target="_blank"
          href="https://github.com/nemasu/puddle-farm"
        >
          <GitHubIcon
            style={{ width: 24, height: 24, transform: "scale(1.3)" }}
          />
        </Button>
        <Button
          component={Link}
          target="_blank"
          href="https://discord.gg/vY4mE8exXB"
        >
          <DiscordIcon
            style={{ width: 24, height: 24, transform: "scale(1.3)" }}
          />
        </Button>
        <Button
          component={Link}
          target="_blank"
          href="https://patreon.com/nemasu"
        >
          <PatreonIcon
            style={{ width: 24, height: 24, transform: "scale(1.1)" }}
          />
        </Button>
      </Box>
      <Box sx={{ minHeight: 100, textAlign: "center" }}>
        <Button component={Link} href="/terms">
          Terms & Privacy
        </Button>
      </Box>

      <Box
        sx={{
          textAlign: "center",
          pb: 2,
          fontSize: "0.75rem",
          color: "text.secondary",
        }}
      >
        This site is not endorsed by or affiliated with Arc System Works.
      </Box>
    </ThemeManager>
  );
};

export default App;
