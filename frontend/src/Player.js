import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { CircularProgress } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { JSONParse } from 'json-with-bigint';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
/* global BigInt */

function getCurrentPlayerRating(player, char_short) {
  for (var key in player.ratings) {
    if (player.ratings[key].char_short === char_short) {
      return {rating: player.ratings[key].rating, deviation: player.ratings[key].deviation};
    }
  }
}

function groupMatches(data, player, char_short, has_offset) {
  const groupedData = [];
  let currentGroup = null;
  data.reverse();

  let limit;
  if( has_offset ) {
    limit = data.length - 1;
  } else {
    limit = data.length;
  }

  for (let i = 0; i < limit; i++) {
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
        odds: match.odds,
        ratingChange: 0,
        timestamp: match.timestamp,
      };
      
      groupedData.push(currentGroup);
    }
  }

  groupedData.reverse();
  groupedData[0].matches.reverse();

  let player_rating = {};
  if( has_offset ) {
    player_rating.rating = data[data.length-1].own_rating_value;
  } else {
    player_rating = getCurrentPlayerRating(player, char_short);
  }
    
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
        <TableCell align="right">{item.floor === '99' ? 'C' : item.floor}</TableCell>
        <TableCell align="right">{item.matches[item.matches.length-1].own_rating_value.toFixed(2)} ±{item.matches[item.matches.length-1].own_rating_deviation.toFixed(2)}</TableCell>
        <TableCell><Button onMouseDown={(event) => {onMouseDown(event)}} component={Link} variant="link">{item.opponent_name}</Button></TableCell>
        <TableCell align="right">{item.matches[0].opponent_character}</TableCell>
        <TableCell align="right">{item.matches[item.matches.length-1].opponent_rating_value.toFixed(2)} ±{item.matches[item.matches.length-1].opponent_rating_deviation.toFixed(2)}</TableCell>
        <TableCell align="right">{item.wins} - {item.losses}</TableCell>
        <TableCell align="right">{(item.odds === 1.0 || item.odds === 0.0) ? '' : (item.odds*100).toFixed(1)+'%' }</TableCell>
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

  const defaultCount = 100;

  const navigate = useNavigate();
  let { player_id, char_short, count,  offset } = useParams();
  
  const [history, setHistory] = useState([]);
  const [player, setPlayer] = useState([]);
  const [currentCharData, setCurrentCharData] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showNext, setShowNext] = useState(true);

  let player_id_checked = player_id;
  if (player_id_checked.match(/[a-zA-Z]/)) {
    player_id_checked = BigInt('0x' + player_id_checked);
  }

  useEffect(() => {

    //TODO redirect to the hihgest rated character
    if( char_short === undefined ) {
      navigate(`/player/${player_id_checked}/SO`);
    }

    window.scrollTo(0, 0);

    const fetchPlayerAndHistory = async () => {
      setLoading(true);
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
        
        for (var key in player_result.ratings) {
          if(player_result.ratings[key].char_short === char_short) {
            setCurrentCharData(player_result.ratings[key]);
          }
        }

        const has_offset = offset ? true : false;

        const url = API_ENDPOINT
          + '/player/'
          + player_id_checked
          +'/' + char_short
          + '/history?count=' + ((has_offset && offset !== '0') ? Number(count)+1 : '100')
          + '&offset=' + (has_offset && offset !== '0' ? Number(offset)-1 : '0');
        const history_response = await fetch(url);
        const history_result = await history_response.json();

        if(history_result.history.length < (count ? count : defaultCount)) {
          setShowNext(false);
        } else {
          setShowNext(true);
        }

        if(history_result.history.length === 0) {
          setLoading(false);
        } else {
          const groupedData = groupMatches(history_result.history, player_result, char_short, has_offset);
          setHistory(groupedData);
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };
    fetchPlayerAndHistory();
  }, [player_id, char_short, count, API_ENDPOINT, player_id_checked, offset]);

  function onPrev(event) {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) - parseInt(nav_count) : 0;
    if(nav_count < 0) {
      nav_count = defaultCount;
    }
    if(nav_offset < 0) {
      nav_offset = 0;
    }
    navigate(`/player/${player_id_checked}/${char_short}/${nav_count}/${nav_offset}`);
  }

  function onNext(event) {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) + parseInt(nav_count) : nav_count;
    navigate(`/player/${player_id_checked}/${char_short}/${nav_count}/${nav_offset}`);
  }

  return (
    <React.Fragment>
      <AppBar position="static"
        style={{backgroundImage: "none"}}
        sx={{backgroundColor:"secondary.main"}}
      >
        <Box sx={{minHeight:100, paddingTop:'30px'}}>
          <Typography align='center' variant="pageHeader" fontSize={30}>

           
            {player.name}
            <Typography variant="platform">
              {player.platform}
            </Typography>
            {player.top_global !== 0 ? (
              <Typography variant="global_rank">
                #{player.top_global} Overall
              </Typography>
            ) : null}
          </Typography>
        </Box>
        { loading ?
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: 'absolute', top:'-1px', color:'white' }}
          />
          : null
        }
      </AppBar>
      <Box sx={{display:'flex', flexWrap:'nowrap'}}>
        <Box m={4} sx={{width:.7}}>
          <Box sx={{maxWidth:1000}}>
            <Typography variant='h6'>
              {currentCharData.character} Rating: {currentCharData.rating} ±{currentCharData.deviation} ({currentCharData.match_count} games)
              {currentCharData.top_char !== 0 ? (
              <Typography variant="char_rank">
                #{currentCharData.top_char}
              </Typography>
            ) : null}
            </Typography>

            <Box mx={3} maxWidth="800px" minWidth="800px" sx={{display: 'inline-block'}}>
              <Button onClick={(event) => onPrev(event)}>Prev</Button>
              <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
            </Box>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell>Timestamp</TableCell>
                    <TableCell align="right">Floor</TableCell>
                    <TableCell align="right">Rating</TableCell>
                    <TableCell>Opponent</TableCell>
                    <TableCell align="right">Character</TableCell>
                    <TableCell align="right">Rating</TableCell>
                    <TableCell align="right">Result</TableCell>
                    <TableCell align="right">Odds</TableCell>
                    <TableCell align="right">Change</TableCell>
                  </TableRow>
                </TableHead>
               <TableBody>
                 {history.map((item, i) => (
                    <Row key={i} item={item} i={i} />
                 ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box mx={3} maxWidth="800px" minWidth="800px" sx={{display: 'inline-block'}}>
              <Button onClick={(event) => onPrev(event)}>Prev</Button>
              <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
            </Box>
          </Box>
        </Box>
        <Box marginLeft={10} marginTop={13} sx={{width:.18, maxWidth:'235px'}}>
          <hr />
          <Typography fontSize={14}>
            Characters:
          </Typography>
          {player.ratings && player.ratings.map((item, i) => (
            <Box key={i}>
              <Button variant="text" onClick={() => {navigate(`/player/${player.id}/${item.char_short}`)}} sx={{textAlign: 'left'}} color='text' >
                <Typography fontSize={12.5} my={0.3}>
                  {item.character} {item.rating} ±{item.deviation}<br />({item.match_count} games)
                </Typography>
              </Button>
              <br />
            </Box>
          ))}
        <hr style={{marginTop:10}}/>
        <ClaimDialog playerId={player_id_checked} setLoading={setLoading} API_ENDPOINT={API_ENDPOINT} />
        </Box>
      </Box>
    </React.Fragment>
  );
};

const ClaimDialog = ({ playerId, setLoading, API_ENDPOINT }) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef(null);
  const counter = useRef(0);

  useEffect(() => {
    if (isPolling) {
      timerRef.current = setInterval(() => {
        pollPlayer(playerId);
      }, 2000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [code, isPolling]);

  const handleClickOpen = async () => {

    //If 'key' is set in localstorage, just redirect to settings
    if(localStorage.getItem('key')) {
      document.location.href = '/settings';
      return;
    }

    if(code === '') {
      const response = await fetch(API_ENDPOINT + '/claim/' + playerId);
      const result = await response.text().then(body => {
        var parsed = JSONParse(body);
        return parsed;
      });

      setCode(result);
    }

    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setIsPolling(false);
  };

  function startPolling() {
    setIsPolling(true);
  }
  
  function pollPlayer(playerId) {
    if (counter.current >= 10) {
      clearInterval(timerRef.current);
      alert("Code is not matching, please try again.");
      document.location.reload();
    }

    const req = new XMLHttpRequest();
    req.open("GET", `${API_ENDPOINT}/claim/poll/${playerId}`);
    req.send();

    req.onreadystatechange = (e) => {
      
      if (req.readyState === 4 && req.status === 200) {
        const resp = JSON.parse(req.response);
        
        if(resp !== 'false') {
          clearInterval(timerRef.current);

          setTimeout(() => {
            localStorage.setItem('key', resp);
            document.location.href = '/settings';
          }, 2000);
        }
      }
    }

    counter.current++;
    
  }

  return (
    <React.Fragment>
      <Button variant="outlined" onClick={handleClickOpen}>
        Claim Profile
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>Claim profile</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {code}<br /><br /><br />
            To confirm that this is your profile, put the above code in your R-Code "free comment" section 
            and close the R-Code so that it saves.<br /><br />
            Press <Button onClick={startPolling}>THIS</Button> once you've done this.<br /><br />
            After the profile has been confirmed you can change your R-code comment back to whatever you want.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </React.Fragment>
  );
}

export default Player;