import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Utils } from './Utils';

const Matchup = () => {
  const navigate = useNavigate();
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
          <Typography variant="h6" gutterBottom>
            Matchup Table (past 3 months)
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: '70vh'}}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>Character</TableCell>
                  {matchup ? (matchup.length > 0 && matchup[0].matchups.map((matchup, index) => (
                    <TableCell key={index}>{matchup.char_short}</TableCell>
                  ))) : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {matchup ? (matchup.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell component="th" scope="row" sx={{ position: 'sticky', left: 0, background: 'black', zIndex: 1 }}>
                      {row.char_name} ({row.char_short})
                    </TableCell>
                    {row.matchups.map((matchup, colIndex) => (
                      <TableCell key={colIndex} title={`Wins: ${matchup.wins}, Total Games: ${matchup.total_games}`}>
                        {Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2))}
                      </TableCell>
                    ))}
                  </TableRow>
                ))) : null}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography marginTop={5}>Statistics are updated once an hour.</Typography>
        </Paper>
      </Box>
    </React.Fragment>
  );
};

export default Matchup;