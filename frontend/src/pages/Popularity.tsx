import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Suspense, use, useState } from "react";
import type { PopularityResult } from "../interfaces/API";
import { Utils } from "./../utils/Utils";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

const PopularityContent = ({
  data,
}: {
  data: Promise<PopularityResult | undefined>;
}) => {
  const popularity = use(data);

  return (
    <Box sx={{ m: 5 }}>
      <Typography variant="h4" gutterBottom align="center">
        Popularity
      </Typography>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          Character Popularity Per Player (Past Month)
        </Typography>
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1">
            This table shows the popularity of each character for each player in
            the last month.
            <br />
            For example: If a character has a popularity of 10%, it means that
            10% of the players have used that character.
            <br />
            It adds up to over 100% because players can use multiple characters.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
          {popularity?.per_player
            .reduce<Array<typeof popularity.per_player>>((acc, e, index) => {
              const groupIndex = Math.floor(index / 10);
              if (!acc[groupIndex]) {
                acc[groupIndex] = [];
              }
              acc[groupIndex].push(e);
              return acc;
            }, [])
            .map((group, groupIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: synthetic group index, no stable id
              <Box key={groupIndex} sx={{ width: "300px" }}>
                <TableContainer
                  component={Paper}
                  sx={{ marginBottom: 4, marginRight: 2 }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Character</TableCell>
                        <TableCell>Popularity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.map((e) => (
                        <TableRow key={e.name}>
                          <TableCell>{e.name}</TableCell>
                          <TableCell>
                            {(
                              (e.value / popularity.per_player_total) *
                              100
                            ).toFixed(2)}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
        </Box>
        <Box>
          Total games per player:{" "}
          {popularity && Utils.formatNumber(popularity.per_player_total)}
        </Box>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", marginBottom: 1 }}>
          Character Popularity Per Character (Past Month)
        </Typography>
        <Box sx={{ mb: 4 }}>
          <Typography variant="body1">
            This table shows the game count per character in the last month.
            <br />
            For example: If a character has a popularity of 10%, it means that
            10% of the games are with that character.
            <br />
          </Typography>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap" }}>
          {popularity?.per_character
            .reduce<Array<typeof popularity.per_character>>((acc, e, index) => {
              const groupIndex = Math.floor(index / 10);
              if (!acc[groupIndex]) {
                acc[groupIndex] = [];
              }
              acc[groupIndex].push(e);
              return acc;
            }, [])
            .map((group, groupIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: synthetic group index, no stable id
              <Box key={groupIndex} sx={{ width: "300px" }}>
                <TableContainer
                  component={Paper}
                  sx={{ marginBottom: 4, marginRight: 2 }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Character</TableCell>
                        <TableCell>Popularity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.map((e) => (
                        <TableRow key={e.name}>
                          <TableCell>{e.name}</TableCell>
                          <TableCell>
                            {(
                              ((e.value / popularity.per_character_total) *
                                100) /
                              2
                            ).toFixed(2)}
                            %
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
        </Box>
        <Box>
          Total games per character:{" "}
          {popularity && Utils.formatNumber(popularity.per_character_total * 2)}
        </Box>
      </Box>
      <Box>
        <Typography>Statistics are updated once a day.</Typography>
        {popularity && (
          <Typography variant="body1">
            Last updated: {Utils.formatUTCToLocal(popularity.last_update)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const Popularity = () => {
  const [popularityPromise] = useState(
    (): Promise<PopularityResult | undefined> =>
      fetch(`${API_ENDPOINT}/popularity`)
        .then((res) => res.json())
        .catch(() => undefined),
  );

  return (
    <>
      <title>Popularity | Puddle Farm</title>
      <Suspense
        fallback={
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: "absolute", top: "-1px", color: "white" }}
          />
        }
      >
        <PopularityContent data={popularityPromise} />
      </Suspense>
    </>
  );
};

export default Popularity;
