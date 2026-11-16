"use client";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useState } from "react";
import type { MatchupCharResponse } from "../../interfaces/API";
import { getClassicMessages } from "../../lib/i18n/classic";
import { characterLabel } from "../../lib/ladder-characters";
import type { Language } from "../../lib/site-preferences";
import { PercentChangeLabel } from "../PercentChangeLabel";

const MatchupTable = ({
  data,
  title,
  language = "en",
}: {
  data: MatchupCharResponse[];
  title: string;
  language?: Language;
}) => {
  const messages = getClassicMessages(language).matchup;
  const label = (short: string, name: string) =>
    language === "ja" ? characterLabel(short, name, language) : name;
  const [hoveredRow, setHoveredRow] = useState<number>();
  const [hoveredCol, setHoveredCol] = useState<number>();
  const [orderBy, setOrderBy] = useState<string>("");
  const [order, setOrder] = useState<"asc" | "desc" | undefined>(undefined);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortData = (data: MatchupCharResponse[]) => {
    if (!orderBy && orderBy !== "0") return data;

    return [...data].sort((a, b) => {
      // Handle character column sorting
      if (orderBy === "character") {
        const compareResult = label(a.char_short, a.char_name).localeCompare(
          label(b.char_short, b.char_name),
          language,
        );
        return order === "asc" ? compareResult : -compareResult;
      }
      // Handle matchup column sorting
      const indexA =
        a.matchups[Number(orderBy)]?.wins /
          a.matchups[Number(orderBy)]?.total_games || 0;
      const indexB =
        b.matchups[Number(orderBy)]?.wins /
          b.matchups[Number(orderBy)]?.total_games || 0;
      return order === "asc" ? indexA - indexB : indexB - indexA;
    });
  };

  const sortedData = sortData(data);

  return (
    <>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {title}
      </Typography>
      <TableContainer
        component={Paper}
        sx={{ marginTop: "20px", maxHeight: "70vh" }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{ position: "sticky", top: 0, left: 0, zIndex: 3 }}
              >
                <TableSortLabel
                  active={orderBy === "character"}
                  direction={orderBy === "character" ? order : "asc"}
                  onClick={() => handleRequestSort("character")}
                >
                  {messages.character}
                </TableSortLabel>
              </TableCell>
              {data.length > 0 &&
                data[0].matchups.map((matchup, index) => (
                  <TableCell
                    key={matchup.char_short}
                    sx={{
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      backgroundColor: hoveredCol === index ? "grey" : "black",
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === index.toString()}
                      direction={orderBy === index.toString() ? order : "asc"}
                      onClick={() => handleRequestSort(index.toString())}
                    >
                      {matchup.char_short}
                    </TableSortLabel>
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row, rowIndex) => (
              <TableRow key={row.char_short}>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{
                    position: "sticky",
                    left: 0,
                    background: hoveredRow === rowIndex ? "grey" : "black",
                    zIndex: 1,
                  }}
                >
                  {label(row.char_short, row.char_name)} ({row.char_short})
                </TableCell>
                {row.matchups.map((matchup, colIndex) => (
                  <TableCell
                    key={matchup.char_short}
                    title={
                      language === "ja"
                        ? `${messages.wins}: ${matchup.wins}, ${messages.games}: ${matchup.total_games}`
                        : `Wins: ${matchup.wins}, Total Games: ${matchup.total_games}`
                    }
                    onMouseEnter={() => {
                      setHoveredRow(rowIndex);
                      setHoveredCol(colIndex);
                    }}
                    onMouseLeave={() => {
                      setHoveredRow(undefined);
                      setHoveredCol(undefined);
                    }}
                    sx={{
                      backgroundColor:
                        hoveredRow === rowIndex && hoveredCol === colIndex
                          ? "grey"
                          : "inherit",
                    }}
                  >
                    {matchup.total_games > 0 ? (
                      <PercentChangeLabel
                        percent={(matchup.wins / matchup.total_games) * 100}
                      />
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default MatchupTable;
