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
import { useParams, useNavigate } from 'react-router-dom';
import { JSONParse, JSONStringify } from 'json-with-bigint';
/* global BigInt */

const Player = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [player, setPlayer] = useState([]);

  let { player_id, char_short, game_count } = useParams();

  let player_id_checked = player_id;
  if (player_id_checked.match(/[a-zA-Z]/)) {
    player_id_checked = BigInt('0x' + player_id_checked);
  } 

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchPlayer = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + player_id_checked);
        const result = await response.text().then(body => {

          var parsed = JSONParse(body);
          
          for( var key in parsed.ratings ) {
            parsed.ratings[key].rating = parsed.ratings[key].rating.toFixed(2);
            parsed.ratings[key].deviation = parsed.ratings[key].deviation.toFixed(2);
          }

          setPlayer(parsed);

          return parsed;
        });

        

      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + player_id_checked +'/' + char_short + '/history?game_count='+ (game_count ? game_count : '100'));
        const result = await response.json();

        setHistory(result.history);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
 
    fetchPlayer();
    fetchHistory();

  }, [player_id, char_short, game_count, API_ENDPOINT, player_id_checked]);

  let player_line;
  if(player && player.length != 0) {
    for (var key in player.ratings) {
      if (player.ratings[key].char_short == char_short) {
        player_line = player.name + ' (' + char_short + ') ' + player.ratings[key].rating + ' ±' + player.ratings[key].deviation;
        break;
      }
    }
  }

  return (
    <React.Fragment>
      <AppBar position="static"
        style={{backgroundImage: "none"}}
        sx={{backgroundColor:"secondary.main"}}
      >
        <Box sx={{minHeight:100, paddingTop:'30px'}}>
          <Typography align='center' variant="h4">
            {player_line}
          </Typography>
        </Box>
      </AppBar>

      <Box sx={{display:'flex', flexWrap:'nowrap'}}>
      <Box m={4} sx={{width:.7}}>
        <Box sx={{maxWidth:1000}}>
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
                  <TableCell><TextButton onClick={() => {navigate(`/player/${item.opponent_id}/${item.opponent_character_short}`)}} component={Link} variant="link">{item.opponent_name}</TextButton></TableCell>
                  <TableCell align="right">{item.opponent_character}</TableCell>
                  <TableCell align="right">{item.opponent_rating_value.toFixed(2)} ±{item.opponent_rating_deviation.toFixed(2)}</TableCell>
                  <TableCell align="right">{item.result_wins ? 'Y' : 'N'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        </Box>
      </Box>
      <Box m={4} sx={{width:.2}}>
      <hr />
        <h4>Characters:</h4>
        {player.ratings && player.ratings.map((item, i) => (
          
          <TextButton onClick={() => {navigate(`/player/${player.id}/${item.char_short}`)}} sx={{textAlign: 'left'}} color='text' >
            <Typography my={2}>
              {item.character} {item.rating} ±{item.deviation}
            </Typography>
          </TextButton>

        ))}
      <hr style={{marginTop:30}}/>
      </Box>
      </Box>
    </React.Fragment>
  );
};

export default Player;