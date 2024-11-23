import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Utils } from './Utils';

const Matchup = () => {
  const navigate = useNavigate();
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [matchup, setMatchup] = React.useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);

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
          <Typography variant="body1">
            Win rates are calculated by the number of wins divided by the total number of games played.<br />
            Both characters need to have a deviation of under 30 for the matchup to be included.
          </Typography>
          <TableContainer component={Paper} sx={{ marginTop: '20px', maxHeight: '70vh' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>Character</TableCell>
                  {matchup ? (matchup.data.length > 0 && matchup.data[0].matchups.map((matchup, index) => (
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
                  ))) : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {matchup ? (matchup.data.map((row, rowIndex) => (
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
                          backgroundColor: (hoveredRow === rowIndex && hoveredCol === colIndex) ? 'action.hover' : 'inherit'
                        }}
                      >
                        {Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2))}
                      </TableCell>
                    ))}
                  </TableRow>
                ))) : null}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography marginTop={5}>Statistics are updated once a day.</Typography>
          {matchup ? (
            <Typography variant="body1">
              Last updated: {Utils.formatUTCToLocal(matchup['last_update'])}
            </Typography>
          ) : null}
        </Paper>
      </Box>
    </React.Fragment>
  );
};

export default Matchup;