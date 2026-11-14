"use client";

import {
  Box,
  FormControlLabel,
  FormGroup,
  Switch,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { buildSearchPath } from "../../lib/search";

export function SearchOptions({
  query,
  exact,
}: {
  query: string;
  exact: boolean;
}) {
  const router = useRouter();
  return (
    <Box component="form" action="/search" method="get" sx={{ p: 1 }}>
      <Typography>Search Options</Typography>
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
          label="Exact search"
        />
      </FormGroup>
      <noscript>
        <button type="submit">Apply</button>
      </noscript>
    </Box>
  );
}
