import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Utils } from './Utils';

const calculateAverageWinRate = (matchups) => {
  const totalWins = matchups.reduce((sum, m) => sum + m.wins, 0);
  const totalGames = matchups.reduce((sum, m) => sum + m.total_games, 0);
  return totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
};

const getCharacterWinRates = (matchupData) => {
  if (!matchupData) return [];

  return matchupData
    .map(row => ({
      charName: row.char_name,
      charShort: row.char_short,
      winRate: calculateAverageWinRate(row.matchups)
    }))
    .sort((a, b) => b.winRate - a.winRate);
};

const MatchupTable = ({ data, title }) => {
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);

  return (
    <React.Fragment>
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        {title}
      </Typography>
      <TableContainer component={Paper} sx={{ marginTop: '20px', maxHeight: '70vh' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>Character</TableCell>
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
                  {matchup.char_short}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, rowIndex) => (
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
                      setHoveredRow(null);
                      setHoveredCol(null);
                    }}
                    sx={{
                      backgroundColor: hoveredRow === rowIndex && hoveredCol === colIndex ? 'grey' : 'inherit'
                    }}
                  >
                    {Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2))}
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

  const [matchup, setMatchup] = React.useState(null);


  useEffect(() => {
    fetch(`${API_ENDPOINT}/matchups`)
      .then((response) => response.json())
      .then((data) => {
        setMatchup(data);
      });
  }, [API_ENDPOINT]);

  return (
    <React.Fragment>
      <Box m={2}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Matchup Tables
          </Typography>
          <Typography variant="body1">
            Timeframe is the past month.<br />
            Win rates are calculated by the number of wins divided by the total number of games played.<br />
            Both characters need to have a deviation of under 30 for the matchup to be included.
          </Typography>
          {matchup && matchup.data_all && <MatchupTable data={matchup.data_all} title="All Players" />}
          {matchup && matchup.data_1700 && <MatchupTable data={matchup.data_1700} title="1700+ Players" />}
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