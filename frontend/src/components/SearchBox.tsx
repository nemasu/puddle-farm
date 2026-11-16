import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import { getMessages } from "../lib/i18n";
import type { Language } from "../lib/site-preferences";

interface SearchBoxProps {
  language?: Language;
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  action?: string;
  exact?: boolean;
}

export function SearchBox({
  language = "en",
  query,
  onQueryChange,
  onSearch,
  action,
  exact,
}: SearchBoxProps) {
  const messages = getMessages(language).common;
  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <Box
      component="form"
      action={action}
      method="get"
      onSubmit={handleSubmit}
      sx={{
        width: "100%",
        maxWidth: 400,
      }}
    >
      {exact && <input type="hidden" name="exact" value="true" />}
      <TextField
        name="q"
        fullWidth
        variant="outlined"
        size="small"
        label={messages.search}
        placeholder={messages.searchPlayers}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
        }}
        slotProps={{
          htmlInput: {
            "aria-label": messages.searchPlayers,
            autoComplete: "off",
          },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  edge="end"
                  size="small"
                  aria-label={messages.searchAction}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
