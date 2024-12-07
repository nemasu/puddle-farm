import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import React from "react";
import { useState } from "react";
import { Utils } from "../utils/Utils";
import { MatchupProps } from "../interfaces/PlayerMatchups";

const Matchup: React.FC<MatchupProps> = ({ matchups }) => {

  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc' | undefined>(undefined);


  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedMatchups = React.useMemo(() => {
    if (!matchups?.matchups) return [];

    if (order === null || orderBy === null) {
      return [...matchups.matchups];
    }

    return [...matchups.matchups].sort((a, b) => {
      const aValue = (() => {
        switch (orderBy) {
          case 'character': return a.char_name;
          case 'winrate': return (a.wins / a.total_games) * 100;
          case 'wins': return a.wins;
          case 'total': return a.total_games;
          default: return 0;
        }
      })();

      const bValue = (() => {
        switch (orderBy) {
          case 'character': return b.char_name;
          case 'winrate': return (b.wins / b.total_games) * 100;
          case 'wins': return b.wins;
          case 'total': return b.total_games;
          default: return 0;
        }
      })();

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [matchups, orderBy, order]);

  return (
    <React.Fragment>
      <Typography sx={{ marginTop: 10 }} variant="h6" gutterBottom>
        Matchup Table (past 3 months)
      </Typography>
      <Typography variant='body1'>
        This includes all games played in the past 3 months.
      </Typography>
      <Typography p={2} variant="body1">
        Win Rate
      </Typography>
      <Box component={Paper} sx={{ maxWidth: 350 }}>
        <Typography p={2} variant='body1'>
          {Utils.colorChangeForPercent(((matchups.total_wins / matchups.total_games) * 100).toFixed(2))} ( {matchups.total_wins} / {matchups.total_games} )
        </Typography>
      </Box>
      <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'character'}
                  direction={orderBy === 'character' ? order : 'asc'}
                  onClick={() => handleRequestSort('character')}
                >
                  Character
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <TableSortLabel
                  active={orderBy === 'winrate'}
                  direction={orderBy === 'winrate' ? order : 'asc'}
                  onClick={() => handleRequestSort('winrate')}
                >
                  WR
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <TableSortLabel
                  active={orderBy === 'wins'}
                  direction={orderBy === 'wins' ? order : 'asc'}
                  onClick={() => handleRequestSort('wins')}
                >
                  Wins
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <TableSortLabel
                  active={orderBy === 'total'}
                  direction={orderBy === 'total' ? order : 'asc'}
                  onClick={() => handleRequestSort('total')}
                >
                  Total
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedMatchups.map((matchup, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell component="th" scope="row" sx={{ position: 'sticky', left: 0, background: 'black', zIndex: 1 }}>
                  {matchup.char_name} ({matchup.char_short})
                </TableCell>
                <TableCell>
                  {Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2))}
                </TableCell>
                <TableCell>
                  {matchup.wins}
                </TableCell>
                <TableCell>
                  {matchup.total_games}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </React.Fragment>
  );

}

export default Matchup;