import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableSortLabel } from '@mui/material';
import { Utils } from './../utils/Utils';
import { MatchupResponse, MatchupCharResponse, MatchupEntry } from '../interfaces/API';
import { CharWinRates } from '../interfaces/Matchup';

const calculateAverageWinRate = (matchups: MatchupEntry[]) => {
  const totalWins = matchups.reduce((sum, m) => sum + m.wins, 0);
  const totalGames = matchups.reduce((sum, m) => sum + m.total_games, 0);
  return totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
};

const getCharacterWinRates = (matchupData: MatchupCharResponse[]): CharWinRates[] => {
  if (!matchupData) return [];

  return matchupData
    .map(row => ({
      charName: row.char_name,
      charShort: row.char_short,
      winRate: calculateAverageWinRate(row.matchups)
    }))
    .sort((a, b) => b.winRate - a.winRate);
};

const MatchupTable = ({ data, title }: { data: MatchupCharResponse[], title: string }) => {
  const [hoveredRow, setHoveredRow] = useState<number>();
  const [hoveredCol, setHoveredCol] = useState<number>();
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc' | undefined>(undefined);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortData = (data: MatchupCharResponse[]) => {
    if (!orderBy && orderBy !== "0") return data;

    return [...data].sort((a, b) => {
      // Handle character column sorting
      if (orderBy === 'character') {
        const compareResult = a.char_name.localeCompare(b.char_name);
        return order === 'asc' ? compareResult : -compareResult;
      }
      // Handle matchup column sorting
      const indexA = (a.matchups[Number(orderBy)]?.wins / a.matchups[Number(orderBy)]?.total_games) || 0;
      const indexB = (b.matchups[Number(orderBy)]?.wins / b.matchups[Number(orderBy)]?.total_games) || 0;
      return order === 'asc' ? indexA - indexB : indexB - indexA;
    });
  };

  const sortedData = sortData(data);

  return (
    <React.Fragment>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} sx={{ marginTop: '20px', maxHeight: '70vh' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <TableSortLabel
                  active={orderBy === 'character'}
                  direction={orderBy === 'character' ? order : 'asc'}
                  onClick={() => handleRequestSort('character')}
                >
                  Character
                </TableSortLabel>
              </TableCell>
              {data.length > 0 && data[0].matchups.map((matchup, index) => (
                <TableCell
                  key={index}
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: hoveredCol === index ? 'grey' : 'black'
                  }}
                >
                  <TableSortLabel
                    active={orderBy === index.toString()}
                    direction={orderBy === index.toString() ? order : 'asc'}
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
              <TableRow key={rowIndex}>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{
                    position: 'sticky',
                    left: 0,
                    background: hoveredRow === rowIndex ? 'grey' : 'black',
                    zIndex: 1
                  }}
                >
                  {row.char_name} ({row.char_short})
                </TableCell>
                {row.matchups.map((matchup, colIndex) => (
                  <TableCell
                    key={colIndex}
                    title={`Wins: ${matchup.wins}, Total Games: ${matchup.total_games}`}
                    onMouseEnter={() => {
                      setHoveredRow(rowIndex);
                      setHoveredCol(colIndex);
                    }}
                    onMouseLeave={() => {
                      setHoveredRow(undefined);
                      setHoveredCol(undefined);
                    }}
                    sx={{
                      backgroundColor: hoveredRow === rowIndex && hoveredCol === colIndex ? 'grey' : 'inherit'
                    }}
                  >
                    {matchup.total_games > 0 ? Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2)) : 'N/A'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TableContainer component={Paper} sx={{ marginTop: '20px', maxWidth: '500px' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Character</TableCell>
              <TableCell align="right">Average Win Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data && getCharacterWinRates(data).map((char, index) => (
              <TableRow key={index}>
                <TableCell>{char.charName} ({char.charShort})</TableCell>
                <TableCell align="right">
                  {Utils.colorChangeForPercent(char.winRate.toFixed(2))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </React.Fragment>
  );
}

const Matchup = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [loading, setLoading] = React.useState(true);
  const [matchup, setMatchup] = React.useState<MatchupResponse>();

  useEffect(() => {
    document.title = 'Matchup | Puddle Farm';
    fetch(`${API_ENDPOINT}/matchups`)
      .then((response) => response.json())
      .then((data) => {
        setMatchup(data);
      });

    setLoading(false);
  }, [API_ENDPOINT]);

  return (
    <React.Fragment>
      {loading ?
        <CircularProgress
          size={60}
          variant="indeterminate"
          disableShrink={true}
          sx={{ position: 'absolute', top: '-1px', color: 'white' }}
        />
        : null
      }
      <Box m={2}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Matchup Tables
          </Typography>
          <Typography variant="body1">
            Timeframe is the past month.<br />
            Win rates are calculated by the number of wins divided by the total number of games played.<br />
          </Typography>
          {matchup && matchup.data_all && <MatchupTable data={matchup.data_all} title="All Players" />}
          {matchup && matchup.data_vanq && <MatchupTable data={matchup.data_vanq} title="Vanquisher Players" />}
        </Paper>
        <Typography marginTop={5}>Statistics are updated once a day.</Typography>
        {matchup ? (
          <Typography variant="body1">
            Last updated: {Utils.formatUTCToLocal(matchup['last_update'])}
          </Typography>
        ) : null}
      </Box>
    </React.Fragment>
  );
};

export default Matchup;