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
import Collapse from '@mui/material/Collapse';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import IconButton from '@mui/material/IconButton';
/* global BigInt */

function getCurrentPlayerRating(player, char_short) {
  for (var key in player.ratings) {
    if (player.ratings[key].char_short == char_short) {
      return {rating: player.ratings[key].rating, deviation: player.ratings[key].deviation};
    }
  }
}

function groupMatches(data, player, char_short) {
  const groupedData = [];
  let currentGroup = null;
  data.reverse();

  for (let i = 0; i < data.length; i++) {
    const match = data[i];
    const prevMatch = i > 0 ? data[i - 1] : null;

    if (
      currentGroup &&
      (prevMatch.opponent_id === match.opponent_id) && 
      (prevMatch.opponent_character_short === match.opponent_character_short)
    ) {
      // Continue the current group if the opponent and character are the same as the previous match
      currentGroup.matches.push(match);
      currentGroup.wins += match.result_win ? 1 : 0;
      currentGroup.losses += match.result_win ? 0 : 1;
      if(prevMatch) {
        prevMatch.ratingChange = parseFloat(match.own_rating_value - prevMatch.own_rating_value);
        currentGroup.ratingChange += prevMatch.ratingChange;
        prevMatch.ratingChange = prevMatch.ratingChange.toFixed(2);
      }
    } else {

      if(currentGroup) {
        const lastChange = match.own_rating_value - currentGroup.matches[currentGroup.matches.length-1].own_rating_value;
        currentGroup.ratingChange += lastChange;
        currentGroup.matches.reverse();
        currentGroup.matches[0].ratingChange = lastChange.toFixed(2);
      }

      // Start a new group
      currentGroup = {
        opponent_id: match.opponent_id,
        opponent_name: match.opponent_name,
        floor: match.floor,
        matches: [match],
        wins: match.result_win ? 1 : 0,
        losses: match.result_win ? 0 : 1,
        ratingChange: 0,
        timestamp: match.timestamp,
      };
      
      groupedData.push(currentGroup);
    }
  }

  groupedData.reverse();
  groupedData[0].matches.reverse();

  const player_rating = getCurrentPlayerRating(player, char_short);
  
  const lastChange = player_rating.rating - groupedData[0].matches[0].own_rating_value;
  groupedData[0].ratingChange += lastChange;
  groupedData[0].matches[0].ratingChange = lastChange.toFixed(2);

  return groupedData;
}

function Row(props) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const { item } = props;

  function onMouseDown(event) {
    if(event.button === 1) { //Middle mouse click
      window.open(`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`, '_blank');
    } else {
      navigate(`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`);
    }
  }

  return (
    <React.Fragment>
      <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">{item.timestamp}</TableCell>
        <TableCell align="right">{item.floor == '99' ? 'C' : item.floor}</TableCell>
        <TableCell align="right">{item.matches[item.matches.length-1].own_rating_value.toFixed(2)} ±{item.matches[item.matches.length-1].own_rating_deviation.toFixed(2)}</TableCell>
        <TableCell><TextButton onMouseDown={(event) => {onMouseDown(event)}} component={Link} variant="link">{item.opponent_name}</TextButton></TableCell>
        <TableCell align="right">{item.matches[0].opponent_character}</TableCell>
        <TableCell align="right">{item.matches[item.matches.length-1].opponent_rating_value.toFixed(2)} ±{item.matches[item.matches.length-1].opponent_rating_deviation.toFixed(2)}</TableCell>
        <TableCell align="right">{item.wins} - {item.losses}</TableCell>
        <TableCell align="right">{item.ratingChange.toFixed(2) > 0 ? '+' : ''}{item.ratingChange.toFixed(2)}</TableCell>
      </TableRow>
      <TableRow id={item.timestamp}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableHead>
                <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell align="right">Rating</TableCell>
                <TableCell align="right">Opponent Rating</TableCell>
                <TableCell align="right">Winner?</TableCell>
                <TableCell align="right">Rating Change</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {item.matches.map((item, i) => (
                  <TableRow key={item.timestamp}>
                    <TableCell component="th" scope="row">{item.timestamp}</TableCell>
                    <TableCell align="right">{item.own_rating_value.toFixed(2)} ±{item.own_rating_deviation.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.opponent_rating_value.toFixed(2)} ±{item.opponent_rating_deviation.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                    <TableCell align='right'>{item.ratingChange}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

const Player = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const navigate = useNavigate();
  let { player_id, char_short, game_count } = useParams();
  
  const [history, setHistory] = useState([]);
  const [player, setPlayer] = useState([]);

  let player_id_checked = player_id;
  if (player_id_checked.match(/[a-zA-Z]/)) {
    player_id_checked = BigInt('0x' + player_id_checked);
  }

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchPlayerAndHistory = async () => {
      try {
        const player_response = await fetch(API_ENDPOINT + '/player/' + player_id_checked);
        const player_result = await player_response.text().then(body => {
          var parsed = JSONParse(body);
          return parsed;
        });

        for( var key in player_result.ratings ) {
          player_result.ratings[key].rating = player_result.ratings[key].rating.toFixed(2);
          player_result.ratings[key].deviation = player_result.ratings[key].deviation.toFixed(2);
        }

        setPlayer(player_result);

        const history_response = await fetch(API_ENDPOINT + '/player/' + player_id_checked +'/' + char_short + '/history?game_count='+ (game_count ? game_count : '100'));
        const history_result = await history_response.json();

        const groupedData = groupMatches(history_result.history, player_result, char_short);
        setHistory(groupedData);
        

      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };
    fetchPlayerAndHistory();
  }, [player_id, char_short, game_count, API_ENDPOINT, player_id_checked]);

  let player_line;
  if(player && player.length != 0) {
    const player_rating = getCurrentPlayerRating(player, char_short);
    if(player_rating) {
      player_line = player.name + ' (' + char_short + ') ' + player_rating.rating + ' ±' + player_rating.deviation;
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
                <TableCell></TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell align="right">Floor</TableCell>
                <TableCell align="right">Rating</TableCell>
                <TableCell>Opponent</TableCell>
                <TableCell align="right">Opponent Character</TableCell>
                <TableCell align="right">Opponent Rating</TableCell>
                <TableCell align="right">Result</TableCell>
                <TableCell align="right">Rating Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item, i) => (
                <Row key={i} item={item} i={i} />
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
            <Box key={i}>
              <TextButton onClick={() => {navigate(`/player/${player.id}/${item.char_short}`)}} sx={{textAlign: 'left'}} color='text' >
                <Typography my={2}>
                  {item.character} {item.rating} ±{item.deviation}
                </Typography>
              </TextButton>
              <br />
            </Box>
          ))}
        <hr style={{marginTop:30}}/>
        </Box>
      </Box>
    </React.Fragment>
  );
};

export default Player;