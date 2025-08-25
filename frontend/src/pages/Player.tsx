
import { AppBar, Typography, CircularProgress, useTheme, useMediaQuery, Box, Button, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Utils } from './../utils/Utils';
import { Tag } from './../components/Tag';
import { PlayerResponse, PlayerResponsePlayer, TagResponse } from "../interfaces/API";
import { StorageUtils } from './../utils/Storage';
import { ClaimDialogProps, GroupedMatch } from '../interfaces/Player';
import Matchup from '../components/PlayerMatchup';
import HistoryRow from '../components/HistoryRow';
import { groupMatches } from '../utils/Player';
import { JSONParse } from '../utils/JSONParse';
import RatingChart from '../components/RatingChart';

const Player = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  let API_ENDPOINT = '/api';
  if (process.env.REACT_APP_API_ENDPOINT !== undefined) {
    API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
  }

  const defaultCount = 100;

  const navigate = useNavigate();
  let { player_id, char_short, count, offset } = useParams();

  const [history, setHistory] = useState<GroupedMatch[]>([]);
  const [player, setPlayer] = useState<PlayerResponse | null>(null);
  const [currentCharData, setCurrentCharData] = useState<PlayerResponsePlayer | null>(null);
  const [alias, setAlias] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  const [showNext, setShowNext] = useState(true);

  const [tags, setTags] = useState<{ [key: string]: TagResponse[] }>();

  const [countdown, setCountdown] = useState<number | null>(null);

  const [avatar, setAvatar] = useState<string | null>();
  
  // Match type filter: 'all', 'ranked', 'tower'
  const [matchFilter, setMatchFilter] = useState<'all' | 'ranked' | 'tower'>('all');

  // Filter history based on match type
  const filteredHistory = history.filter(item => {
    if (matchFilter === 'all') return true;
    if (matchFilter === 'ranked') return item.floor === '0';
    if (matchFilter === 'tower') return item.floor !== '0';
    return true;
  });

  let player_id_checked: BigInt;
  if (player_id && player_id.match(/[a-zA-Z]/)) {
    player_id_checked = BigInt('0x' + player_id);
  } else if (player_id) {
    player_id_checked = BigInt(player_id);
  } else {
    player_id_checked = BigInt(0);
  }

  function onLinkClick(event: React.MouseEvent<HTMLElement, MouseEvent>, url: string) {
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
        }

        setPlayer(player_result);

        if (player_result.id === 0) {
          setHistory([]);
          setCurrentCharData(null);
          setAlias([]);
          setLoading(false);
          setAvatar(null);
          return;
        }

        //Redirect to the highest rated character
        if (char_short === undefined) {

          let highest_rating = -1;
          let highest_char = 'SO';
          for (var pkey in player_result.ratings) {
            if (Number(player_result.ratings[pkey].rating) > Number(highest_rating)) {
              highest_rating = Number(player_result.ratings[pkey].rating);
              highest_char = player_result.ratings[pkey].char_short;
            }
          }

          navigate(`/player/${player_id_checked}/${highest_char}`, { replace: true });
          return;
        }

        var currentCharKey = null;
        for (var ckey in player_result.ratings) {
          if (player_result.ratings[ckey].char_short === char_short) {

            document.title = player_result.name + ' (' + char_short + ') - ' + Utils.displaySimpleRating(Number(player_result.ratings[ckey].rating)) + ' | Puddle Farm';

            setCurrentCharData(player_result.ratings[ckey]);
            currentCharKey = ckey;
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
        if (history_response.status === 200) {

          const history_result = await history_response.text().then(body => {
            var parsed = JSONParse(body);
            return parsed;
          });

          if (history_result.history.length < (count ? count : defaultCount)) {
            setShowNext(false);
          } else {
            setShowNext(true);
          }

          if (history_result.history.length !== 0) {
            const groupedData = groupMatches(history_result.history, player_result, char_short, has_offset);

            let tags: { [key: string]: TagResponse[] } = {};
            Object.entries(history_result.tags).forEach(([playerId, tagArray]) => {
              tags[playerId] = (tagArray as TagResponse[]).map(tagObj => ({
                tag: tagObj.tag,
                style: tagObj.style
              }));
            });
            setTags(tags);
            setHistory(groupedData);
          }
        }

        const alias_response = await fetch(API_ENDPOINT + '/alias/' + player_id_checked);

        if (alias_response.status === 200) {
          const alias_result = await alias_response.json();

          if (alias_result !== null) {
            //loop through alias_result and remove current player name
            for (var akey in alias_result) {
              if (alias_result[akey] === player_result.name) {
                alias_result.splice(akey, 1);
              }
            }
            setAlias(alias_result);
          }
        }

        const avatar_response = await fetch(API_ENDPOINT + '/avatar/' + player_id_checked);
        if (avatar_response.status === 200) {
          const avatar_result = await avatar_response.blob();
          setAvatar(URL.createObjectURL(avatar_result));
        }

        setLoading(false);

      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };
    fetchPlayerAndHistory();

    if (StorageUtils.getAutoUpdate()) {
      const interval = setInterval(() => {
        fetchPlayerAndHistory();
        setCountdown(60);
      }, 60000);

      const countdownInterval = setInterval(() => {
        setCountdown((prevCountdown) => (prevCountdown !== null && prevCountdown > 0 ? prevCountdown - 1 : 0));
      }, 1000);

      setCountdown(60);

      return () => {
        clearInterval(interval);
        clearInterval(countdownInterval);
      };
    }

  }, [player_id, char_short, count, API_ENDPOINT, player_id_checked, offset]);

  function onPrev(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) - nav_count : 0;
    if (nav_count < 0) {
      nav_count = defaultCount;
    }
    if (nav_offset < 0) {
      nav_offset = 0;
    }
    navigate(`/player/${player_id_checked}/${char_short}/${nav_count}/${nav_offset}`);
  }

  function onNext(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) + nav_count : nav_count;
    navigate(`/player/${player_id_checked}/${char_short}/${nav_count}/${nav_offset}`);
  }

  return (
    <React.Fragment>
      {loading ?
        <CircularProgress
          size={60}
          variant="indeterminate"
          disableShrink={true}
          sx={{ position: 'absolute', top: '-1px', color: 'white' }}
        />
        : null
      }
      <AppBar position="static"
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >
        {isMobile ? (
          <Box sx={{ minHeight: 50, display: { xs: 'block', md: 'none' } }}> {/* Mobile View */}
            {player ? (
              <React.Fragment>
                <Typography textAlign={'center'} variant="pageHeader" fontSize={30} marginTop={2}>
                  <Box>
                    {player.tags ? player.tags.map((e, i) => (
                      <Tag key={i} style={JSON.parse(e.style)}>
                        {e.tag}
                      </Tag>
                    )) : null}
                  </Box>
                  <Typography variant="playerName">
                    {player.name}
                  </Typography>
                  <Typography variant="platform">
                    {player.platform}
                  </Typography>
                  {player.top_global !== 0 ? (
                    <Typography variant="global_rank" onMouseDown={(event) => navigate(`/top_global`)} sx={{ cursor: 'pointer' }}>
                      #{player.top_global} Overall
                    </Typography>
                  ) : null}
                </Typography>
              </React.Fragment>
            ) : null}
            {alias && alias.length > 0 ? (
              <Box textAlign='center' fontSize={17}>
                <Typography variant='platform' sx={{ position: 'relative', top: '0px', marginTop: '10px' }} display={'inline-block'}>
                  AKA
                </Typography>
                <Box m={1} sx={{ display: 'inline-block' }}>
                  {alias.map((item, i) => (
                    <Typography variant="playerName" px={0.8} py={0.2} mx={0.3} my={0.2} display={'inline-block'} key={i}>
                      {item}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ) : null}
          </Box>
        ) : (
          <Box sx={{ minHeight: 100, paddingTop: '30px', display: { xs: 'none', md: 'block' } }}> {/* Desktop View */}
            {player ? (
              <React.Fragment>
                <Typography align='center' variant="pageHeader" fontSize={30}>
                  <Box>
                    {player.tags ? player.tags.map((e, i) => (
                      <Tag key={i} style={JSON.parse(e.style)}>
                        {e.tag}
                      </Tag>
                    )) : null}
                  </Box>
                  <Typography variant="playerName">
                    {player.name}
                  </Typography>
                  <Typography variant="platform">
                    {player.platform}
                  </Typography>
                  {player.top_global !== 0 ? (
                    <Typography variant="global_rank" onMouseDown={(event) => navigate(`/top_global`)} sx={{ cursor: 'pointer' }}>
                      #{player.top_global} Overall
                    </Typography>
                  ) : null}
                </Typography>
              </React.Fragment>
            ) : null}
            {alias && alias.length > 0 ? (
              <Box textAlign='center' fontSize={17}>
                <Typography variant='platform' sx={{ position: 'relative', top: '0px', marginTop: '10px' }} display={'inline-block'}>
                  AKA
                </Typography>
                <Box m={1} sx={{ display: 'inline-block' }}>
                  {alias.map((item, i) => (
                    <Typography variant="playerName" px={0.8} py={0.2} mx={0.3} my={0.2} display={'inline-block'} key={i}>
                      {item}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ) : null}
          </Box>
        )}
      </AppBar>
      {isMobile ? (
        <Box sx={{ display: { xs: 'block', md: 'none' } }}> {/* Mobile View */}
          <Box m={1}>
            <Box>
              {currentCharData ? (
                <React.Fragment>
                  <Typography variant='h5' my={2}>
                    {currentCharData.character} Last Rating: <Box title={currentCharData.rating.toString()} component={"span"}>{Utils.displayRating(currentCharData.rating)}</Box>({currentCharData.match_count} games)
                    {currentCharData.top_char !== 0 ? (
                      <Typography variant="char_rank" onMouseDown={(event) => onLinkClick(event, `/top/${currentCharData.char_short}`)} sx={{ cursor: 'pointer' }}>
                        #{currentCharData.top_char} {currentCharData.character}
                      </Typography>
                    ) : null}
                  </Typography>
                  {currentCharData.top_rating.value !== 0 ? (
                    <React.Fragment>
                      <Typography>
                        Top Rating: <Box title={currentCharData.top_rating.value.toString()} component={"span"}>{Utils.displayRating(currentCharData.top_rating.value)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_rating.timestamp)})
                      </Typography>
                    </React.Fragment>
                  ) : null}
                  {currentCharData.top_defeated.value !== 0.0 ? (
                    <Typography>
                      Top Defeated: <Button sx={{ fontSize: '16px' }} component={Link} onMouseDown={(event) => onLinkClick(event, `/player/${currentCharData.top_defeated.id}/${currentCharData.top_defeated.char_short}`)}>{currentCharData.top_defeated.name} ({currentCharData.top_defeated.char_short})</Button> <Box title={currentCharData.top_defeated.value.toString()} component={"span"}>{Utils.displayRating(currentCharData.top_defeated.value)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_defeated.timestamp)})
                    </Typography>
                  ) : null}

                </React.Fragment>
              ) : null}
              {countdown !== null ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Auto-update in: {countdown} seconds
                  </Typography>
                </Box>
              ) : null}
              {history ? (
                <React.Fragment>
                  <Box mx={3} mb={2}>
                    <Typography variant="h6" gutterBottom>
                      Match History
                    </Typography>
                    <Box sx={{ /*display: 'flex'*/ display: 'none', gap: 1, mb: 2 }}>
                      <Button 
                        variant={matchFilter === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setMatchFilter('all')}
                        size="small"
                      >
                        All Matches
                      </Button>
                      <Button 
                        variant={matchFilter === 'ranked' ? 'contained' : 'outlined'}
                        onClick={() => setMatchFilter('ranked')}
                        size="small"
                      >
                        Ranked Only
                      </Button>
                      <Button 
                        variant={matchFilter === 'tower' ? 'contained' : 'outlined'}
                        onClick={() => setMatchFilter('tower')}
                        size="small"
                      >
                        Tower Only
                      </Button>
                    </Box>
                    <Button onClick={(event) => onPrev(event)}>Prev</Button>
                    <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
                  </Box>
                  {tags && filteredHistory.map((item, i) => (
                    <Box py={0.3} key={i}>
                      <HistoryRow key={i} item={item} isMobile={true} tags={tags[item.opponent_id.toString()]} />
                    </Box>
                  ))}
                  <Box mx={3}>
                    <Button onClick={(event) => onPrev(event)}>Prev</Button>
                    <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
                  </Box>
                </React.Fragment>
              ) : null}
            </Box>
            {currentCharData ? (
              <RatingChart player_id={player_id_checked} API_ENDPOINT={API_ENDPOINT} char_short={char_short} />
            ) : null}
            <Matchup player_id={player_id_checked} API_ENDPOINT={API_ENDPOINT} char_short={char_short} />
          </Box>
          <Box marginLeft={10} marginTop={13} sx={{ width: .18, maxWidth: '235px' }}>
            {avatar && <img src={avatar} alt="Player Avatar" style={{ transform: 'scale(0.5)' }} />}
            {player && player.id !== BigInt(0) ? (
              <React.Fragment>
                <hr />
                <Typography fontSize={14}>
                  Characters:
                </Typography>
                {player.ratings && player.ratings.map((item, i) => (
                  <Box key={i}>
                    <Button variant="text" onMouseDown={(event) => { onLinkClick(event, `/player/${player.id}/${item.char_short}`) }} sx={{ textAlign: 'left', color: 'white' }}>
                      <Typography fontSize={12.5} my={0.3}>
                        {item.character} {Utils.displayRating(item.rating)} <br />({item.match_count} games)
                      </Typography>
                    </Button>
                    <br />
                  </Box>
                ))}
                <hr style={{ marginTop: 10 }} />
              </React.Fragment>
            ) : null}
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: { xs: 'none', md: 'flex', overflow: 'hidden' } }}> {/* Desktop View */}
          <Box m={4} sx={{ flex: 1, overflowY: 'auto', minWidth: '840px' }}>
            <Box>
              {currentCharData ? (
                <React.Fragment>
                  <Typography variant='h5' my={2}>
                    {currentCharData.character} Last Rating: <Box title={currentCharData.rating.toString()} component={"span"}>{Utils.displayRating(currentCharData.rating)}</Box> ({currentCharData.match_count} games)
                    {currentCharData.top_char !== 0 ? (
                      <Typography variant="char_rank" onMouseDown={(event) => onLinkClick(event, `/top/${currentCharData.char_short}`)} sx={{ cursor: 'pointer' }}>
                        #{currentCharData.top_char} {currentCharData.character}
                      </Typography>
                    ) : null}
                  </Typography>

                  {currentCharData.top_rating.value !== 0 ? (
                    <React.Fragment>
                      <Typography>
                        Top Rating: <Box title={currentCharData.top_rating.value.toString()} component={"span"}>{Utils.displayRating(currentCharData.top_rating.value)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_rating.timestamp)})
                      </Typography>
                    </React.Fragment>
                  ) : null}

                  {currentCharData.top_defeated.value !== 0.0 ? (
                    <Typography>
                      Top Defeated: <Button sx={{ fontSize: '16px' }} component={Link} onMouseDown={(event) => onLinkClick(event, `/player/${currentCharData.top_defeated.id}/${currentCharData.top_defeated.char_short}`)}>{currentCharData.top_defeated.name} ({currentCharData.top_defeated.char_short})</Button> <Box title={currentCharData.top_defeated.value.toString()} component={"span"}>{Utils.displayRating(currentCharData.top_defeated.value)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_defeated.timestamp)})
                    </Typography>
                  ) : null}

                </React.Fragment>
              ) : null}
              {countdown !== null ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Auto-update in: {countdown} seconds
                  </Typography>
                </Box>
              ) : null}
              {history ? (
                <React.Fragment>
                  <Box sx={{ display: 'none' }} mx={3} mb={2}>
                    <Typography variant="h6" gutterBottom>
                      Match History
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button 
                        variant={matchFilter === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setMatchFilter('all')}
                        size="small"
                      >
                        All Matches
                      </Button>
                      <Button 
                        variant={matchFilter === 'ranked' ? 'contained' : 'outlined'}
                        onClick={() => setMatchFilter('ranked')}
                        size="small"
                      >
                        Ranked Only
                      </Button>
                      <Button 
                        variant={matchFilter === 'tower' ? 'contained' : 'outlined'}
                        onClick={() => setMatchFilter('tower')}
                        size="small"
                      >
                        Tower Only
                      </Button>
                    </Box>
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
                          <TableCell width="120px" align="right">Rating</TableCell>
                          <TableCell>Opponent</TableCell>
                          <TableCell align="right">Character</TableCell>
                          <TableCell width="120px" align="right">Rating</TableCell>
                          <TableCell align="right">Result</TableCell>
                          <TableCell align="right">Change</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tags && filteredHistory.map((item, i) => (
                          <HistoryRow key={i} item={item} tags={tags[item.opponent_id.toString()]} />
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
            {currentCharData ? (
              <RatingChart player_id={player_id_checked} API_ENDPOINT={API_ENDPOINT} char_short={char_short}/>
            ) : null}
            <Matchup player_id={player_id_checked} API_ENDPOINT={API_ENDPOINT} char_short={char_short} />
          </Box>
          <Box sx={{ width: 300, overflowY: 'auto', minWidth: '200px' }}>
            {avatar && <img src={avatar} alt="Player Avatar" style={{ transform: 'scale(0.5)' }} />}
            {player && player.id !== BigInt(0) ? (
              <React.Fragment>
                <hr />
                <Typography fontSize={14}>
                  Characters:
                </Typography>
                {player.ratings && player.ratings.map((item, i) => (
                  <Box key={i}>
                    <Button variant="text" onMouseDown={(event) => { onLinkClick(event, `/player/${player.id}/${item.char_short}`) }} sx={{ textAlign: 'left', color: 'white' }}>
                      <Typography fontSize={12.5} my={0.3}>
                        {item.character} {Utils.displayRating(item.rating)}<br />({item.match_count} games)
                      </Typography>
                    </Button>
                    <br />
                  </Box>
                ))}
                <hr style={{ marginTop: 10 }} />
              </React.Fragment>
            ) : null}
          </Box>
        </Box>
      )}
    </React.Fragment>
  );
};

export default Player;