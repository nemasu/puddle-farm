import React, { useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useParams } from 'react-router-dom';
/* global BigInt */

const History = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [history, setHistory] = useState([]);
  const [player, setPlayer] = useState([]);

  const urlSearchString = window.location.search;
  const params = new URLSearchParams(urlSearchString);

  let { player_id, char_short, game_count } = useParams();

  if (player_id.match(/[a-zA-Z]/)) {
    player_id = BigInt('0x' + player_id);
  } 

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + player_id +'/' + char_short);
        const result = await response.json();
        setPlayer(result);
        console.log(result);
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + player_id +'/' + char_short + '/history?game_count='+ game_count);
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
        <Typography variant="h3" component="div" sx={{ flexGrow: 1 }}>
            {player.id} - {params.get('char_short')} - {player.name}: {player.rating} ±{player.deviation}
        </Typography>

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
      </React.Fragment>
  );
};

export default History;