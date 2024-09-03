import React, { useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import TextButton from '@mui/material/Button';
import Link from '@mui/material/Link';
import { useParams } from 'react-router-dom';
/* global BigInt */

const History = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [history, setHistory] = useState([]);
  const [player, setPlayer] = useState([]);

  let { player_id, char_short, game_count } = useParams();

  let player_id_checked = player_id;
  if (player_id_checked.match(/[a-zA-Z]/)) {
    player_id_checked = BigInt('0x' + player_id_checked);
  } 

  useEffect(() => {
    console.log("called");
    const fetchPlayer = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + player_id_checked +'/' + char_short);
        const result = await response.json();

        result.rating = result.rating.toFixed(2);
        result.deviation = result.deviation.toFixed(2);

        setPlayer(result);
        console.log(result);

      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + player_id_checked +'/' + char_short + '/history?game_count='+ (game_count ? game_count : '100'));
        const result = await response.json();
        setHistory(result.history);
        console.log(result.history);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
 
    fetchPlayer();
    fetchHistory();
    

  }, [player_id, char_short, game_count, API_ENDPOINT, player_id_checked]);

  function onLinkClick(id, char) {
    player_id = id;
    char_short = char;
    
    //FIXME: I can't get this page to load using different parameters.
    //TextButton below does not work. Link does not work. Changing player_id or char_short does not work.
    //Only this works:
    window.location = '/history/' + id + '/' + char;
  }

  return (
    <React.Fragment>
      <AppBar position="static"
        style={{backgroundImage: "none"}}
        sx={{backgroundColor:"secondary.main"}}
      >
        <Box sx={{minHeight:100, paddingTop:'30px'}}>
          <Typography align='center' variant="h4">
            {player.name} ({char_short}) {player.rating} ±{player.deviation}
          </Typography>
        </Box>
      </AppBar>

      <Box maxWidth="1000px" m={5}>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell align="right">Floor</TableCell>
                <TableCell align="right">Rating</TableCell>
                <TableCell>Opponent</TableCell>
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
                  <TableCell align="right">{item.own_rating_value.toFixed(2)} ±{item.own_rating_deviation.toFixed(2)}</TableCell>
                  <TableCell><TextButton onClick={() => {onLinkClick(item.opponent_id, item.opponent_character_short)}} component={Link} variant="link" to={`/history/${item.opponent_id}/${item.opponent_character_short}`}>{item.opponent_name}</TextButton></TableCell>
                  <TableCell align="right">{item.opponent_character}</TableCell>
                  <TableCell align="right">{item.opponent_rating_value.toFixed(2)} ±{item.opponent_rating_deviation.toFixed(2)}</TableCell>
                  <TableCell align="right">{item.result_wins ? 'Y' : 'N'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </React.Fragment>
  );
};

export default History;