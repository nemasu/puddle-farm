import { Box, Button, Typography } from "@mui/material";
import { getMessages } from "../../lib/i18n";
import type { Language } from "../../lib/site-preferences";
import { FooterExtras } from "../../site";

export function Footer({ language }: { language: Language }) {
  const messages = getMessages(language).footer;
  return (
    <footer>
      <Typography align="center">{messages.contribute}</Typography>
      <Box sx={{ minHeight: 100, textAlign: "center" }}>
        <Button
          href="https://github.com/nemasu/puddle-farm"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={messages.github}
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
        <Button href="/terms">{messages.terms}</Button>
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
        {messages.disclaimer}
      </Box>
    </footer>
  );
}
