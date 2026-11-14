import { AppBar, Container, Link, Toolbar } from "@mui/material";

function GameNavBar() {
  return (
    <AppBar
      component="nav"
      position="static"
      aria-label="Games"
      elevation={0}
      style={{ backgroundImage: "none" }}
    >
      <Container>
        <Toolbar variant="dense" disableGutters sx={{ gap: 2 }}>
          <Link
            href="/"
            color="inherit"
            underline="none"
            sx={{ fontWeight: 700 }}
          >
            GGST
          </Link>
          <Link
            href="https://discord.gg/vY4mE8exXB"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join the Puddle Farm Discord"
            color="inherit"
            sx={{ display: "inline-flex", ml: "auto", p: 0.5 }}
          >
            {/* biome-ignore lint/performance/noImgElement: static SVG brand mark. */}
            <img
              alt=""
              src="/discord-mark-white.svg"
              style={{ width: 26, height: 20 }}
            />
          </Link>
          <Link
            href="https://patreon.com/nemasu"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Support Puddle Farm on Patreon"
            color="inherit"
            sx={{ display: "inline-flex", p: 0.5 }}
          >
            {/* biome-ignore lint/performance/noImgElement: static SVG brand mark. */}
            <img
              alt=""
              src="/patreon-mark-white.svg"
              style={{ width: 24, height: 24 }}
            />
          </Link>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default GameNavBar;
