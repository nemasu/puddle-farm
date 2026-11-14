import { Box, Button, Typography } from "@mui/material";
import { FooterExtras } from "../../site";

export function Footer() {
  return (
    <footer>
      <Typography align="center">
        Puddle Farm is an open source project. Feel free to contribute!
      </Typography>
      <Box sx={{ minHeight: 100, textAlign: "center" }}>
        <Button
          href="https://github.com/nemasu/puddle-farm"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Puddle Farm on GitHub"
        >
          {/* biome-ignore lint/performance/noImgElement: static SVG brand mark. */}
          <img
            src="/github-mark-white.svg"
            alt=""
            width={24}
            height={24}
            style={{ transform: "scale(1.3)" }}
          />
        </Button>
      </Box>
      <Box sx={{ minHeight: 100, textAlign: "center" }}>
        <Button href="/terms">Terms &amp; Privacy</Button>
        <FooterExtras />
      </Box>
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          fontSize: "0.75rem",
          color: "text.secondary",
        }}
      >
        This site is not endorsed by or affiliated with Arc System Works.
      </Box>
    </footer>
  );
}
