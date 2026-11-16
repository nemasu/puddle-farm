"use client";

import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { getClassicMessages } from "../../lib/i18n/classic";
import { buildSearchPath } from "../../lib/search";
import type { Language } from "../../lib/site-preferences";

export function SearchOptions({
  query,
  exact,
  language = "en",
}: {
  query: string;
  exact: boolean;
  language?: Language;
}) {
  const messages = getClassicMessages(language);
  const router = useRouter();
  return (
    <Box component="form" action="/search" method="get" sx={{ p: 1 }}>
      <Typography>{messages.ladder.searchTitle}</Typography>
      <input type="hidden" name="q" value={query} />
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              name="exact"
              value="true"
              checked={exact}
              onChange={(event) => {
                router.push(buildSearchPath(query, event.target.checked));
              }}
            />
          }
          label={messages.ladder.exactSearch}
        />
      </FormGroup>
      <noscript>
        <button type="submit">{messages.ladder.apply}</button>
      </noscript>
    </Box>
  );
}
