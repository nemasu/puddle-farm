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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Line } from 'react-chartjs-2';
/* global BigInt */

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function getCurrentPlayerRating(player, char_short) {
  for (var key in player.ratings) {
    if (player.ratings[key].char_short === char_short) {
      return { rating: player.ratings[key].rating, deviation: player.ratings[key].deviation };
    }
  }
}

function groupMatches(data, player, char_short, has_offset) {
  const groupedData = [];
  let currentGroup = null;
  data.reverse();

  let limit;
  if (has_offset) {
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
      if (prevMatch) {
        prevMatch.ratingChange = parseFloat(match.own_rating_value - prevMatch.own_rating_value);
        currentGroup.ratingChange += prevMatch.ratingChange;
        prevMatch.ratingChange = prevMatch.ratingChange.toFixed(2);
      }
    } else {

      if (currentGroup) {
        const lastChange = match.own_rating_value - currentGroup.matches[currentGroup.matches.length - 1].own_rating_value;
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
  if (has_offset) {
    player_rating.rating = data[data.length - 1].own_rating_value;
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

  function onProfileClick(event) {
    if (event.button === 1) { //Middle mouse click
      window.open(`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`, '_blank');
    } else if (event.button === 0) { //Left mouse click
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
        <TableCell align="right"><Box component={'span'} title={item.matches[item.matches.length - 1].own_rating_value}>{item.matches[item.matches.length - 1].own_rating_value.toFixed(0)}</Box> <Box component={'span'} title={item.matches[item.matches.length - 1].own_rating_deviation}>±{item.matches[item.matches.length - 1].own_rating_deviation.toFixed(0)}</Box></TableCell>
        <TableCell><Button onMouseDown={(event) => { onProfileClick(event) }} component={Link} variant="link" >{item.opponent_name}</Button></TableCell>
        <TableCell align="right">{item.matches[0].opponent_character}</TableCell>
        <TableCell align="right"><Box component={'span'} title={item.matches[item.matches.length - 1].opponent_rating_value}>{item.matches[item.matches.length - 1].opponent_rating_value.toFixed(0)}</Box> <Box component={'span'} title={item.matches[item.matches.length - 1].opponent_rating_deviation}>±{item.matches[item.matches.length - 1].opponent_rating_deviation.toFixed(0)}</Box></TableCell>
        <TableCell align="right">{item.wins} - {item.losses}</TableCell>
        <TableCell align="right">{(item.odds === 1.0 || item.odds === 0.0) ? '' : (item.odds * 100).toFixed(1) + '%'}</TableCell>
        <TableCell align="right">{item.ratingChange > 0 ? '+' : ''}{item.ratingChange.toFixed(1)}</TableCell>
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
                    <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
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
  let { player_id, char_short, count, offset } = useParams();

  const [history, setHistory] = useState(null);
  const [player, setPlayer] = useState(null);
  const [currentCharData, setCurrentCharData] = useState(null);
  const [alias, setAlias] = useState(null);

  const [loading, setLoading] = useState(true);

  const [showNext, setShowNext] = useState(true);

  const [hideClaim, setHideClaim] = useState(false);

  const [lineChartOptions, setLineChartOptions] = useState({});
  const [lineChartData, setLineChartData] = useState(null);

  let player_id_checked = player_id;
  if (player_id_checked.match(/[a-zA-Z]/)) {
    player_id_checked = BigInt('0x' + player_id_checked);
  }

  function onProfileClick(event, url) {
    if (event.button === 1) { //Middle mouse click
      window.open(url, '_blank');
    } else if (event.button === 0) { //Left mouse click
      navigate(url);
    }
  }

  useEffect(() => {

    window.scrollTo(0, 0);

    const fetchPlayerAndHistory = async () => {
      setLoading(true);
      try {
        const player_response = await fetch(API_ENDPOINT + '/player/' + player_id_checked);
        const player_result = await player_response.text().then(body => {
          var parsed = JSONParse(body);
          return parsed;
        });

        for (var key in player_result.ratings) {
          player_result.ratings[key].rating = player_result.ratings[key].rating.toFixed(2);
          player_result.ratings[key].deviation = player_result.ratings[key].deviation.toFixed(2);
        }

        setPlayer(player_result);

        if (player_result.name === 'Player not found' && player_result.id === 0) {
          setHideClaim(true);
        } else if (player_result.id === 0) {
          setHistory(null);
          setCurrentCharData(null);
          setAlias(null);
        }

        //Redirect to the highest rated character
        if (char_short === undefined) {

          let highest_rating = 0;
          let highest_char = 'SO';
          for (var key in player_result.ratings) {
            if (player_result.ratings[key].rating > highest_rating) {
              highest_rating = player_result.ratings[key].rating;
              highest_char = player_result.ratings[key].char_short;
            }
          }

          navigate(`/player/${player_id_checked}/${highest_char}`);
          return;
        }

        var currentCharKey = null;
        for (var key in player_result.ratings) {
          if (player_result.ratings[key].char_short === char_short) {
            setCurrentCharData(player_result.ratings[key]);
            currentCharKey = key;
          }
        }

        const has_offset = offset ? true : false;

        const url = API_ENDPOINT
          + '/player/'
          + player_id_checked
          + '/' + char_short
          + '/history?count=' + ((has_offset && offset !== '0') ? Number(count) + 1 : '100')
          + '&offset=' + (has_offset && offset !== '0' ? Number(offset) - 1 : '0');
        const history_response = await fetch(url);
        const history_result = await history_response.json();

        if (history_result.history.length < (count ? count : defaultCount)) {
          setShowNext(false);
        } else {
          setShowNext(true);
        }

        if (history_result.history.length !== 0) {
          const groupedData = groupMatches(history_result.history, player_result, char_short, has_offset);
          setHistory(groupedData);
        }

        const alias_response = await fetch(API_ENDPOINT + '/alias/' + player_id_checked);
        const alias_result = await alias_response.json();

        if (alias_result !== null) {
          //loop through alias_result and remove current player name
          for (var key in alias_result) {
            if (alias_result[key] === player_result.name) {
              alias_result.splice(key, 1);
            }
          }
          setAlias(alias_result);
        }

        const rating_history_response = await fetch(API_ENDPOINT + '/ratings/' + player_id_checked + '/' + char_short);
        const rating_history_result = await rating_history_response.json();

        if (rating_history_result !== null && currentCharKey in player_result.ratings) {

          rating_history_result.reverse();

          //Add current rating to the end
          rating_history_result.push({
            timestamp: "Now",
            rating: player_result.ratings[currentCharKey].rating,
          });

          const lineChartOptions = {
            responsive: true,
            width: 400,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Rating History (100 matches)',
              },
            },
          };
          setLineChartOptions(lineChartOptions);


          var lineChartData = {
            labels: rating_history_result.map(item => item.timestamp),
            datasets: [
              {
                label: 'Rating',
                data: rating_history_result.map(item => item.rating),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
              },
            ],
          };
        }

        setLineChartData(lineChartData);

        setLoading(false);

      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };
    fetchPlayerAndHistory();
  }, [player_id, char_short, count, API_ENDPOINT, player_id_checked, offset]);

  function onPrev(event) {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) - parseInt(nav_count) : 0;
    if (nav_count < 0) {
      nav_count = defaultCount;
    }
    if (nav_offset < 0) {
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
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >

        <Box sx={{ minHeight: 100, paddingTop: '30px' }}>
          {player ? (
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
          ) : null}

          {alias && alias.length > 0 ? (
            <Box align='center' fontSize={17}>
              <Typography variant='platform' sx={{ position: 'relative', top: '0px', borderRadius: '5px', py: '5px' }} display={'inline-block'}>
                AKA
              </Typography>
              <Box m={1} sx={{ display: 'inline-block' }}>
                {alias.map((item, i) => (
                  <Box px={0.8} py={0.2} mx={0.3} my={0.2} sx={{ backgroundColor: 'primary.main', borderRadius: '3px' }} display={'inline-block'} key={i}>
                    {item}
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}

        </Box>
        {loading ?
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: 'absolute', top: '-1px', color: 'white' }}
          />
          : null
        }
      </AppBar>
      <Box sx={{ display: 'flex', flexWrap: 'nowrap' }}>
        <Box m={4} sx={{ width: .7 }}>
          <Box sx={{ minWidth: 1000, maxWidth: 1100 }}>
            {currentCharData ? (
              <React.Fragment>
                <Typography variant='h5' my={2}>
                  {currentCharData.character} Rating: <Box title={currentCharData.rating} component={"span"}>{Math.round(currentCharData.rating)}</Box> ±<Box title={currentCharData.deviation} component={"span"}>{Math.round(currentCharData.deviation)}</Box> ({currentCharData.match_count} games)
                  {currentCharData.top_char !== 0 ? (
                    <Typography variant="char_rank">
                      #{currentCharData.top_char}
                    </Typography>
                  ) : null}
                </Typography>

                {currentCharData.top_rating.value !== 0 ? (
                  <React.Fragment>
                    <Typography variant='h7'>
                      Top Rating: <Box title={currentCharData.top_rating.value} component={"span"}>{Math.round(currentCharData.top_rating.value)}</Box> ±<Box title={currentCharData.top_rating.deviation} component={"span"}>{Math.round(currentCharData.top_rating.deviation)}</Box> ({currentCharData.top_rating.timestamp})
                    </Typography>
                    <br />
                  </React.Fragment>
                ) : null}

                {currentCharData.top_defeated.value !== 0.0 ? (
                  <Typography variant='h7'>
                    Top Defeated: <Button sx={{ fontSize: '16px' }} component={Link} variant="link" onMouseDown={(event) => onProfileClick(event, `/player/${currentCharData.top_defeated.id}/${currentCharData.top_defeated.char_short}`)}>{currentCharData.top_defeated.name} ({currentCharData.top_defeated.char_short})</Button> <Box title={currentCharData.top_defeated.value} component={"span"}>{Math.round(currentCharData.top_defeated.value)}</Box> ±<Box title={currentCharData.top_defeated.deviation} component={"span"}>{Math.round(currentCharData.top_defeated.deviation)}</Box> ({currentCharData.top_defeated.timestamp})
                  </Typography>
                ) : null}

              </React.Fragment>
            ) : null}

            {history ? (
              <React.Fragment>
                <Box mx={3}>
                  <Button onClick={(event) => onPrev(event)}>Prev</Button>
                  <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
                </Box>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell></TableCell>
                        <TableCell width="170px">Timestamp</TableCell>
                        <TableCell>Floor</TableCell>
                        <TableCell width="100px" align="right">Rating</TableCell>
                        <TableCell>Opponent</TableCell>
                        <TableCell align="right">Character</TableCell>
                        <TableCell width="100px" align="right">Rating</TableCell>
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
                <Box mx={3}>
                  <Button onClick={(event) => onPrev(event)}>Prev</Button>
                  <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
                </Box>
              </React.Fragment>
            ) : null}
          </Box>
          {lineChartData ? (
            <Line options={lineChartOptions} data={lineChartData} />
          ) : null}
        </Box>
        <Box marginLeft={10} marginTop={13} sx={{ width: .18, maxWidth: '235px' }}>
          {player && player.id !== 0 ? (
            <React.Fragment>
              <hr />
              <Typography fontSize={14}>
                Characters:
              </Typography>
              {player.ratings && player.ratings.map((item, i) => (
                <Box key={i}>
                  <Button variant="text" onClick={() => { navigate(`/player/${player.id}/${item.char_short}`) }} sx={{ textAlign: 'left', color: 'white' }}>
                    <Typography fontSize={12.5} my={0.3}>
                      {item.character} {item.rating} ±{item.deviation}<br />({item.match_count} games)
                    </Typography>
                  </Button>
                  <br />
                </Box>
              ))}
              <hr style={{ marginTop: 10 }} />
            </React.Fragment>
          ) : null}

          {hideClaim ? null : (<ClaimDialog playerId={player_id_checked} setLoading={setLoading} API_ENDPOINT={API_ENDPOINT} />)}
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
    if (localStorage.getItem('key')) {
      document.location.href = '/settings';
      return;
    }

    if (code === '') {
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

        if (resp !== 'false') {
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