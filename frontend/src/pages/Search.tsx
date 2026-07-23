import { Button, CircularProgress } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Suspense, use, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { PlayerSearchResponse } from "../interfaces/API";
import { JSONParse } from "../utils/JSONParse";
import { Utils } from "../utils/Utils";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

function fetchSearchResults(
  q: string,
  exact: boolean,
): Promise<{ results: PlayerSearchResponse[] }> {
  if (!q) return Promise.resolve({ results: [] });

  const params = new URLSearchParams({
    search_string: q,
    exact: String(exact),
  });

  return fetch(`${API_ENDPOINT}/player/search?${params.toString()}`)
    .then((res) => res.text())
    .then((body) => {
      const parsed = JSONParse(body) as { results: PlayerSearchResponse[] };
      return parsed;
    })
    .catch(() => ({ results: [] }));
}

interface SearchResultsProps {
  resultsPromise: Promise<{ results: PlayerSearchResponse[] }>;
}

const SearchResultsLoader = ({
  searchQuery,
  exact,
}: {
  searchQuery: string;
  exact: boolean;
}) => {
  const [resultsPromise] = useState(() =>
    fetchSearchResults(searchQuery, exact),
  );
  return (
    <Suspense fallback={<CircularProgress size={60} />}>
      <SearchResults resultsPromise={resultsPromise} />
    </Suspense>
  );
};

const SearchResults = ({ resultsPromise }: SearchResultsProps) => {
  const data = use(resultsPromise);
  const players = data.results ?? [];

  if (players.length === 0) {
    return (
      <Box sx={{ m: 4 }}>
        <Typography align="center">No results found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ m: 4, maxWidth: "700px" }}>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Player</TableCell>
              <TableCell>Character</TableCell>
              <TableCell>Rating</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {players.map((player) => (
              <TableRow key={`${player.id}-${player.char_short}`}>
                <TableCell>
                  <Button
                    component={Link}
                    to={`/player/${player.id}/${player.char_short}`}
                  >
                    {player.name}
                  </Button>
                </TableCell>
                <TableCell>{player.char_short}</TableCell>
                <TableCell>
                  {Utils.displayRankIcon(player.rating, "32px")}
                  <Box component={"span"}>
                    {Utils.displayRating(player.rating)}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

const Search = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const exact = searchParams.get("exact") === "true";

  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger only
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, exact]);

  return (
    <>
      <title>Search Results | Puddle Farm</title>
      <AppBar
        position="static"
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >
        <Box sx={{ minHeight: 100, paddingTop: "30px" }}>
          <Typography align="center" variant="pageHeader">
            Search Results
          </Typography>
        </Box>
      </AppBar>

      <SearchResultsLoader
        key={`${searchQuery}-${exact}`}
        searchQuery={searchQuery}
        exact={exact}
      />
    </>
  );
};

export default Search;
