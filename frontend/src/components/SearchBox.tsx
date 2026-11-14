import SearchIcon from "@mui/icons-material/Search";
import { Box, InputAdornment } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";

interface SearchBoxProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSearch: (query: string) => void;
  action?: string;
  exact?: boolean;
}

export function SearchBox({
  query,
  onQueryChange,
  onSearch,
  action,
  exact,
}: SearchBoxProps) {
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
        label="Search"
        placeholder="Search Player Names"
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
        }}
        slotProps={{
          htmlInput: {
            "aria-label": "Search Player Names",
            autoComplete: "off",
          },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  type="submit"
                  edge="end"
                  size="small"
                  aria-label="search"
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
