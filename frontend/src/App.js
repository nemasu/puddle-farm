import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import AppBar from '@mui/material/AppBar';
import Typography from '@mui/material/Typography';

import React, { useState, useEffect } from 'react';

const App = () => {
  const defaultTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#811104',
      },
      secondary: {
        main: '#c00000',
      },
      background: {
        default: '#171717',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#C00000',
          },
        },
      },
    },
  });

  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [history, setHistory] = useState([]);
  const [player, setPlayer] = useState([]);

  const urlSearchString = window.location.search;
  const params = new URLSearchParams(urlSearchString);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        
        const response = await fetch(API_ENDPOINT + '/player/' + params.get('player') +'/' + params.get('char_short'));
        const result = await response.json();
        setPlayer(result);
        console.log(result);
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + params.get('player') +'/' + params.get('char_short') + '/history?game_count='+params.get('game_count'));
        const result = await response.json();
        setHistory(result.history);
        console.log(result.history);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
 
    fetchPlayer();
    fetchHistory();

  }, []);

  return (
    <React.Fragment>
    <ThemeProvider theme={defaultTheme}>
      <CssBaseline enableColorScheme />
        
        <AppBar position="static">
          <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
            {player.id} - {params.get('char_short')} - {player.name}: {player.rating} ±{player.deviation}
          </Typography>
        </AppBar>

        <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell align="right">Floor</TableCell>
              <TableCell align="right">Rating</TableCell>
              <TableCell align="right">Opponent</TableCell>
              <TableCell align="right">Opponent Character</TableCell>
              <TableCell align="right">Opponent Rating</TableCell>
              <TableCell align="right">Winner?</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((item, i) => (
              <TableRow key={i} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">{item.timestamp}</TableCell>
                <TableCell align="right">{item.floor == '99' ? 'C' : item.floor}</TableCell>
                <TableCell align="right">{item.own_rating_value} ±{item.own_rating_deviation}</TableCell>
                <TableCell align="right">{item.opponent_name}</TableCell>
                <TableCell align="right">{item.opponent_character}</TableCell>
                <TableCell align="right">{item.opponent_rating_value} ±{item.opponent_rating_deviation}</TableCell>
                <TableCell align="right">{item.result_wins ? 'Y' : 'N'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </ThemeProvider>
      </React.Fragment>
  );
};

export default App;