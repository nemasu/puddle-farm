import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { AppBar, Typography, CircularProgress, useTheme, useMediaQuery, TableSortLabel, Box, Button, Collapse, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React, { useEffect, useState, useRef } from 'react';
import { To, useNavigate, useParams } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Utils } from './Utils';
import { Tag } from './Tag';
import { PlayerResponse, PlayerResponsePlayer, RatingsResponse, TagResponse } from "./Interfaces";
import { StorageUtils } from './Storage';

let ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend;
import('chart.js').then(module => {
  ChartJS = module.Chart;
  CategoryScale = module.CategoryScale;
  LinearScale = module.LinearScale;
  PointElement = module.PointElement;
  LineElement = module.LineElement;
  Title = module.Title;
  Tooltip = module.Tooltip;
  Legend = module.Legend;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );
});

let Line: React.ComponentType<any>;
import('react-chartjs-2').then(module => {
  Line = module.Line;
});

let JSONParse: (arg0: string) => any;
import('json-with-bigint').then(module => {
  JSONParse = module.JSONParse;
});
/* global BigInt */

interface GroupedMatch {
  floor: string; // Floor of the match (e.g., "Celestial", "99")
  losses: number; // Number of losses in this set of matches
  matches: any[]; // Array of individual match details (not provided in the inspection)
  odds: number; // Player's odds of winning the set
  opponent_character_short: string; // Opponent's character (short name)
  opponent_id: BigInt; // Opponent's ID
  opponent_name: string; // Opponent's name
  ratingChange: number; // Change in rating after this set of matches
  timestamp: string; // Timestamp of the match set
  wins: number; // Number of wins in this set of matches
}

interface LineChartData {
  labels: string[];
  datasets: LineChartDataSet[];
}

interface LineChartDataSet {
  label: string;
  data: number[];
  borderColor: string;
  backgroundColor: string;
}

function getCurrentPlayerRating(player: PlayerResponse, char_short: string) {
  for (var key in player.ratings) {
    if (player.ratings[key].char_short === char_short) {
      return { rating: player.ratings[key].rating, deviation: player.ratings[key].deviation };
    }
  }
}

function groupMatches(data: any[], player: PlayerResponse, char_short: string, has_offset: boolean) {
  const groupedData = [];
  let currentGroup = null;
  let lastValidGroup = null;
  let lastValidMatch = null;
  data.reverse();

  let limit;
  if (has_offset) {
    limit = data.length - 1;
  } else {
    limit = data.length;
  }

  for (let i = 0; i < limit; i++) {
    const match = data[i];

    if (
      currentGroup &&
      (currentGroup.opponent_id === match.opponent_id) &&
      (currentGroup.opponent_character_short === match.opponent_character_short)
    ) {
      // Continue the current group if the opponent and character are the same as the previous match
      currentGroup.matches.push(match);
      currentGroup.wins += match.result_win ? 1 : 0;
      currentGroup.losses += match.result_win ? 0 : 1;
      if (match.own_rating_value !== 0) {
        if (lastValidMatch) {
          const ratingChange = parseFloat((match.own_rating_value - lastValidMatch.own_rating_value).toString());
          currentGroup.ratingChange += ratingChange;
          lastValidMatch.ratingChange = ratingChange.toFixed(2);
        }
      }
    } else {
      if (currentGroup) {
        // Only calculate rating change if the last match in the current group is valid
        // This will not calculate the rating change for the most recent match for the group before a hidden group
        if (lastValidMatch && match.own_rating_value !== 0 && currentGroup.matches[0].own_rating_value !== 0) {
          const lastChange = match.own_rating_value - lastValidMatch.own_rating_value;
          currentGroup.ratingChange += lastChange;
          currentGroup.matches.reverse();
          currentGroup.matches[0].ratingChange = lastChange.toFixed(2);
        } else {
          currentGroup.matches.reverse();
        }
      }

      // Start a new group
      currentGroup = {
        opponent_id: match.opponent_id,
        opponent_name: match.opponent_name,
        opponent_character_short: match.opponent_character_short,
        floor: match.floor,
        matches: [match],
        wins: match.result_win ? 1 : 0,
        losses: match.result_win ? 0 : 1,
        odds: match.odds,
        ratingChange: 0,
        timestamp: match.timestamp,
      };

      //This calculates the rating change for the most recent match for the group before a hidden group
      if (currentGroup !== lastValidGroup
        && match.own_rating_value !== 0
        && lastValidGroup
        && !lastValidGroup.matches[0].ratingChange) {

        const lastChange = match.own_rating_value - lastValidMatch.own_rating_value;
        lastValidGroup.ratingChange += lastChange;
        lastValidGroup.matches[0].ratingChange = lastChange.toFixed(2);
      }

      if (match.own_rating_value !== 0) {
        lastValidGroup = currentGroup;
      }

      groupedData.push(currentGroup);
    }

    // Update lastValidMatch if the current match is valid
    if (match.own_rating_value !== 0) {
      lastValidMatch = match;
    }
  }

  groupedData.reverse();
  groupedData[0].matches.reverse();

  let player_rating: { rating?: number } = {};
  if (has_offset) {
    player_rating.rating = data[data.length - 1].own_rating_value;
  } else {
    const currentRating = getCurrentPlayerRating(player, char_short);
    player_rating = currentRating ? { rating: currentRating.rating } : { rating: undefined };
  }

  // Calculate the final rating change with the first good match
  for (let i = 0; i < groupedData.length; i++) {
    if (groupedData[i].matches[0].own_rating_value !== 0) {
      const lastChange = player_rating.rating !== undefined ? player_rating.rating - groupedData[i].matches[0].own_rating_value : 0;
      groupedData[i].ratingChange += lastChange;
      groupedData[i].matches[0].ratingChange = lastChange.toFixed(2);
      break;
    }
  }

  return groupedData;
}

function Row(props: { isMobile?: boolean; item?: GroupedMatch; tags?: TagResponse[]; }) {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const { item, tags } = props;

  if (!item) return null;

  function onProfileClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
    if (!item) return;
    if (event.button === 1) { //Middle mouse click
      window.open(`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`, '_blank');
    } else if (event.button === 0) { //Left mouse click
      navigate(`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`);
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const [date, time] = Utils.formatUTCToLocal(timestamp).split(' ');
    return (
      <React.Fragment>
        <Box sx={{ p: 0, m: 0 }}>
          {date}
        </Box>
        <Box sx={{ p: 0, m: 0 }}>
          {time}
        </Box>
      </React.Fragment>
    );
  };

  if (props.isMobile) {
    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableBody>
            {item.opponent_id === BigInt(0) ? (
              <React.Fragment>
                <TableRow>
                  <TableCell sx={{ pb: 0, mb: 0 }}>
                    <IconButton
                      aria-label="expand row"
                      size="small"
                      onClick={() => setOpen(!open)}
                    >
                      {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}>{formatTimestamp(item.timestamp)}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.wins} - {item.losses}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ px: 0, mx: 0 }} colSpan={2}><Button sx={{ marginLeft: '5px' }} component={Link} variant="link" >{item.opponent_name}</Button></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.matches[0].opponent_character}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
                </TableRow>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <TableRow>
                  <TableCell sx={{ p: 0, m: 0 }}>
                    <IconButton
                      aria-label="expand row"
                      size="small"
                      onClick={() => setOpen(!open)}
                    >
                      {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}>{formatTimestamp(item.timestamp)}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}> {item.matches[item.matches.length - 1].own_rating_value.toFixed(0)} ±{item.matches[item.matches.length - 1].own_rating_deviation.toFixed(0)} </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{(item.odds === 1.0 || item.odds === 0.0) ? '' : (item.odds * 100).toFixed(1) + '%'}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.wins} - {item.losses}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ px: 0, mx: 0, maxWidth: '120px' }} colSpan={2}>
                    <Button sx={{ marginLeft: '5px' }} onMouseDown={(event) => { onProfileClick(event) }} component={Link} variant="link" >{item.opponent_name}</Button>
                    <React.Fragment>
                      <Box>
                        {tags && tags.map((e: TagResponse, i: number) => (
                          <Tag key={i} style={JSON.parse(e.style)} sx={{ fontSize: '0.9rem' }}>
                            {e.tag}
                          </Tag>
                        ))}
                      </Box>
                    </React.Fragment>
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>
                    {item.matches[item.matches.length - 1].opponent_rating_value.toFixed(0)} ±{item.matches[item.matches.length - 1].opponent_rating_deviation.toFixed(0)}
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.matches[0].opponent_character_short}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>
                    {Utils.colorChangeForRating(item.ratingChange.toFixed(1))}
                  </TableCell>
                </TableRow>
              </React.Fragment>
            )}
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
                          {item.opponent_id === "0" ? (
                            <React.Fragment>
                              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                              <TableCell align="right"></TableCell>
                              <TableCell align="right"></TableCell>
                              <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                              <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                            </React.Fragment>
                          ) : (
                            <React.Fragment>
                              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                              <TableCell align="right">{item.own_rating_value.toFixed(2)} ±{item.own_rating_deviation.toFixed(2)}</TableCell>
                              <TableCell align="right">{item.opponent_rating_value.toFixed(2)} ±{item.opponent_rating_deviation.toFixed(2)}</TableCell>
                              <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                              <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                            </React.Fragment>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Collapse>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  } else {
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
          {item.opponent_id === BigInt("0") ? (
            <React.Fragment>
              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
              <TableCell align="right">{item.floor === '99' ? 'C' : item.floor}</TableCell>
              <TableCell align="right"></TableCell>
              <TableCell><Button component={Link} variant="link" >{item.opponent_name}</Button></TableCell>
              <TableCell align="right">{item.matches[0].opponent_character}</TableCell>
              <TableCell align="right"></TableCell>
              <TableCell align="right">{item.wins} - {item.losses}</TableCell>
              <TableCell align="right"></TableCell>
              <TableCell align="right"></TableCell>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
              <TableCell align="right">{item.floor === '99' ? 'C' : item.floor}</TableCell>
              <TableCell align="right"><Box component={'span'} title={item.matches[item.matches.length - 1].own_rating_value}>{item.matches[item.matches.length - 1].own_rating_value.toFixed(0)}</Box> <Box component={'span'} title={item.matches[item.matches.length - 1].own_rating_deviation}>±{item.matches[item.matches.length - 1].own_rating_deviation.toFixed(0)}</Box></TableCell>
              <TableCell >
                <Button onMouseDown={(event) => { onProfileClick(event) }} component={Link} variant="link" >{item.opponent_name}</Button>
                <React.Fragment>
                  <Box>
                    {tags && tags.map((e: TagResponse, i: number) => (
                      <Tag key={i} style={JSON.parse(e.style)} sx={{ fontSize: '0.9rem', position: 'unset' }}>
                        {e.tag}
                      </Tag>
                    ))}
                  </Box>
                </React.Fragment>
              </TableCell>
              <TableCell align="right">{item.matches[0].opponent_character}</TableCell>
              <TableCell align="right"><Box component={'span'} title={item.matches[item.matches.length - 1].opponent_rating_value}>{item.matches[item.matches.length - 1].opponent_rating_value.toFixed(0)}</Box> <Box component={'span'} title={item.matches[item.matches.length - 1].opponent_rating_deviation}>±{item.matches[item.matches.length - 1].opponent_rating_deviation.toFixed(0)}</Box></TableCell>
              <TableCell align="right">{item.wins} - {item.losses}</TableCell>
              <TableCell align="right">{(item.odds === 1.0 || item.odds === 0.0) ? '' : (item.odds * 100).toFixed(1) + '%'}</TableCell>
              <TableCell align="right">
                {Utils.colorChangeForRating(item.ratingChange.toFixed(1))}
              </TableCell>
            </React.Fragment>
          )}
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
                      {item.opponent_id === 0 ? (
                        <React.Fragment>
                          <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                          <TableCell align="right"></TableCell>
                          <TableCell align="right"></TableCell>
                          <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                          <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
                          <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                          <TableCell align="right">{item.own_rating_value.toFixed(2)} ±{item.own_rating_deviation.toFixed(2)}</TableCell>
                          <TableCell align="right">{item.opponent_rating_value.toFixed(2)} ±{item.opponent_rating_deviation.toFixed(2)}</TableCell>
                          <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                          <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                        </React.Fragment>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Collapse>
          </TableCell>
        </TableRow>
      </React.Fragment >
    );
  }
}

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

  const [hideClaim, setHideClaim] = useState(false);

  const [lineChartOptions, setLineChartOptions] = useState({});
  const [lineChartData, setLineChartData] = useState<LineChartData | null>(null);

  const [tags, setTags] = useState<{ [key: string]: TagResponse[] }>();

  const [countdown, setCountdown] = useState<number | null>(null);

  //This is for matchup table
  //TODO - Move this to a separate component
  interface Matchup {
    char_name: string;
    char_short: string;
    wins: number;
    total_games: number;
  }

  interface Matchups {
    matchups: Matchup[];
    total_wins: number;
    total_games: number;
  }

  const [matchups, setMatchups] = useState<Matchups | null>(null);

  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc' | undefined>(undefined);


  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedMatchups = React.useMemo(() => {
    if (!matchups?.matchups) return [];

    if (order === null || orderBy === null) {
      return [...matchups.matchups];
    }

    return [...matchups.matchups].sort((a, b) => {
      const aValue = (() => {
        switch (orderBy) {
          case 'character': return a.char_name;
          case 'winrate': return (a.wins / a.total_games) * 100;
          case 'wins': return a.wins;
          case 'total': return a.total_games;
          default: return 0;
        }
      })();

      const bValue = (() => {
        switch (orderBy) {
          case 'character': return b.char_name;
          case 'winrate': return (b.wins / b.total_games) * 100;
          case 'wins': return b.wins;
          case 'total': return b.total_games;
          default: return 0;
        }
      })();

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [matchups, orderBy, order]);

  //MU table end

  let player_id_checked: BigInt;
  if (player_id && player_id.match(/[a-zA-Z]/)) {
    player_id_checked = BigInt('0x' + player_id);
  } else if (player_id) {
    player_id_checked = BigInt(player_id);
  } else {
    player_id_checked = BigInt(0);
  }

  function onProfileClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, url: string) {
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
          setHistory([]);
          setCurrentCharData(null);
          setAlias([]);
          setLineChartData(null);
          setMatchups(null);
          setLoading(false);
          return;
        }

        //Redirect to the highest rated character
        if (char_short === undefined) {

          let highest_rating = 0;
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

            document.title = player_result.name + ' (' + char_short + ') - ' + Number(player_result.ratings[ckey].rating).toFixed() + ' ±' + Number(player_result.ratings[ckey].deviation).toFixed() + ' | Puddle Farm';

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

        const rating_history_response = await fetch(API_ENDPOINT + '/ratings/' + player_id_checked + '/' + char_short);
        if (rating_history_response.status === 200) {
          const rating_history_result = await rating_history_response.json();

          if (rating_history_result !== null && currentCharKey !== null && currentCharKey in player_result.ratings) {

            rating_history_result.reverse();

            //Add current rating to the end
            rating_history_result.push({
              timestamp: "Now",
              rating: player_result.ratings[currentCharKey].rating,
            });

            const lineChartOptions = {
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Rating History (100 matches)',
                },
              },
              scales: {
                x: {
                  ticks: {
                    display: false,
                  }
                }
              }
            };
            setLineChartOptions(lineChartOptions);

            const lineChartData = {
              labels: rating_history_result.map((item: RatingsResponse) => Utils.formatUTCToLocal(item.timestamp)),
              datasets: [
                {
                  label: 'Rating',
                  data: rating_history_result.map((item: RatingsResponse) => item.rating),
                  borderColor: 'rgb(75, 192, 192)',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                },
              ],
            };

            setLineChartData(lineChartData);
          }

          const matchups = await fetch(API_ENDPOINT + '/matchups/' + player_id_checked + '/' + char_short);
          if (matchups.status === 200) {
            const matchups_result = await matchups.json();
            if (matchups_result !== null) {

              let total_wins = 0;
              let total_games = 0;
              for (var mkey in matchups_result.matchups) {
                total_wins += matchups_result.matchups[mkey].wins;
                total_games += matchups_result.matchups[mkey].total_games;
              }

              matchups_result.total_wins = total_wins;
              matchups_result.total_games = total_games;

              setMatchups(matchups_result);
            }
          }
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
                <Typography textAlign={'center'} variant="pageHeader" fontSize={30}>
                  <Box>
                    {player.tags ? player.tags.map((e, i) => (
                      <Tag key={i} style={JSON.parse(e.style)}>
                        {e.tag}
                      </Tag>
                    )) : null}
                  </Box>
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
              </React.Fragment>
            ) : null}
            {alias && alias.length > 0 ? (
              <Box textAlign='center' fontSize={17}>
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
              </React.Fragment>
            ) : null}
            {alias && alias.length > 0 ? (
              <Box textAlign='center' fontSize={17}>
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
        )}
      </AppBar>
      {isMobile ? (
        <Box sx={{ display: { xs: 'block', md: 'none' } }}> {/* Mobile View */}
          <Box m={1}>
            <Box>
              {currentCharData ? (
                <React.Fragment>
                  <Typography variant='h5' my={2}>
                    {currentCharData.character} Rating: <Box title={currentCharData.rating.toString()} component={"span"}>{Math.round(currentCharData.rating)}</Box> ±<Box title={currentCharData.deviation.toString()} component={"span"}>{Math.round(currentCharData.deviation)}</Box> ({currentCharData.match_count} games)
                    {currentCharData.top_char !== 0 ? (
                      <Typography variant="char_rank">
                        #{currentCharData.top_char} {currentCharData.character}
                      </Typography>
                    ) : null}
                  </Typography>
                  {currentCharData.top_rating.value !== 0 ? (
                    <React.Fragment>
                      <Typography>
                        Top Rating: <Box title={currentCharData.top_rating.value.toString()} component={"span"}>{Math.round(currentCharData.top_rating.value)}</Box> ±<Box title={currentCharData.top_rating.deviation.toString()} component={"span"}>{Math.round(currentCharData.top_rating.deviation)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_rating.timestamp)})
                      </Typography>
                    </React.Fragment>
                  ) : null}
                  {currentCharData.top_defeated.value !== 0.0 ? (
                    <Typography>
                      Top Defeated: <Button sx={{ fontSize: '16px' }} component={Link} variant="link" onMouseDown={(event) => onProfileClick(event, `/player/${currentCharData.top_defeated.id}/${currentCharData.top_defeated.char_short}`)}>{currentCharData.top_defeated.name} ({currentCharData.top_defeated.char_short})</Button> <Box title={currentCharData.top_defeated.value.toString()} component={"span"}>{Math.round(currentCharData.top_defeated.value)}</Box> ±<Box title={currentCharData.top_defeated.deviation.toString()} component={"span"}>{Math.round(currentCharData.top_defeated.deviation)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_defeated.timestamp)})
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
                  <Box mx={3}>
                    <Button onClick={(event) => onPrev(event)}>Prev</Button>
                    <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
                  </Box>
                  {tags && history.map((item, i) => (
                    <Box py={0.3} key={i}>
                      <Row key={i} item={item} isMobile={true} tags={tags[item.opponent_id.toString()]} />
                    </Box>
                  ))}
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
            {matchups ? (
              <React.Fragment>
                <Typography sx={{ marginTop: 10 }} variant="h6" gutterBottom>
                  Matchup Table (past 3 months)
                </Typography>
                <Typography variant='body1'>
                  This includes all games played in the past 3 months.
                </Typography>
                <Typography p={2} variant="body1">
                  Win Rate
                </Typography>
                <Box component={Paper} sx={{ maxWidth: 350 }}>
                  <Typography p={2} variant='body1'>
                    {Utils.colorChangeForPercent(((matchups.total_wins / matchups.total_games) * 100).toFixed(2))} ( {matchups.total_wins} / {matchups.total_games} )
                  </Typography>
                </Box>
                <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'character'}
                            direction={orderBy === 'character' ? order : 'asc'}
                            onClick={() => handleRequestSort('character')}
                          >
                            Character
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <TableSortLabel
                            active={orderBy === 'winrate'}
                            direction={orderBy === 'winrate' ? order : 'asc'}
                            onClick={() => handleRequestSort('winrate')}
                          >
                            WR
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <TableSortLabel
                            active={orderBy === 'wins'}
                            direction={orderBy === 'wins' ? order : 'asc'}
                            onClick={() => handleRequestSort('wins')}
                          >
                            Wins
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <TableSortLabel
                            active={orderBy === 'total'}
                            direction={orderBy === 'total' ? order : 'asc'}
                            onClick={() => handleRequestSort('total')}
                          >
                            Total
                          </TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedMatchups.map((matchup, rowIndex) => (
                        <TableRow key={rowIndex}>
                          <TableCell component="th" scope="row" sx={{ position: 'sticky', left: 0, background: 'black', zIndex: 1 }}>
                            {matchup.char_name} ({matchup.char_short})
                          </TableCell>
                          <TableCell>
                            {Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2))}
                          </TableCell>
                          <TableCell>
                            {matchup.wins}
                          </TableCell>
                          <TableCell>
                            {matchup.total_games}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </React.Fragment>
            ) : null}
          </Box>
          <Box marginLeft={10} marginTop={13} sx={{ width: .18, maxWidth: '235px' }}>
            {player && player.id !== BigInt(0) ? (
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
      ) : (
        <Box sx={{ display: { xs: 'none', md: 'flex', overflow: 'hidden' } }}> {/* Desktop View */}
          <Box m={4} sx={{ flex: 1, overflowY: 'auto', minWidth: '840px' }}>
            <Box>
              {currentCharData ? (
                <React.Fragment>
                  <Typography variant='h5' my={2}>
                    {currentCharData.character} Rating: <Box title={currentCharData.rating.toString()} component={"span"}>{Math.round(currentCharData.rating)}</Box> ±<Box title={currentCharData.deviation.toString()} component={"span"}>{Math.round(currentCharData.deviation)}</Box> ({currentCharData.match_count} games)
                    {currentCharData.top_char !== 0 ? (
                      <Typography variant="char_rank">
                        #{currentCharData.top_char} {currentCharData.character}
                      </Typography>
                    ) : null}
                  </Typography>

                  {currentCharData.top_rating.value !== 0 ? (
                    <React.Fragment>
                      <Typography>
                        Top Rating: <Box title={currentCharData.top_rating.value.toString()} component={"span"}>{Math.round(currentCharData.top_rating.value)}</Box> ±<Box title={currentCharData.top_rating.deviation.toString()} component={"span"}>{Math.round(currentCharData.top_rating.deviation)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_rating.timestamp)})
                      </Typography>
                    </React.Fragment>
                  ) : null}

                  {currentCharData.top_defeated.value !== 0.0 ? (
                    <Typography>
                      Top Defeated: <Button sx={{ fontSize: '16px' }} component={Link} variant="link" onMouseDown={(event) => onProfileClick(event, `/player/${currentCharData.top_defeated.id}/${currentCharData.top_defeated.char_short}`)}>{currentCharData.top_defeated.name} ({currentCharData.top_defeated.char_short})</Button> <Box title={currentCharData.top_defeated.value.toString()} component={"span"}>{Math.round(currentCharData.top_defeated.value)}</Box> ±<Box title={currentCharData.top_defeated.deviation.toString()} component={"span"}>{Math.round(currentCharData.top_defeated.deviation)}</Box> ({Utils.formatUTCToLocal(currentCharData.top_defeated.timestamp)})
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
                        {tags && history.map((item, i) => (
                          <Row key={i} item={item} tags={tags[item.opponent_id.toString()]} />
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
            {matchups ? (
              <React.Fragment>
                <Typography sx={{ marginTop: 10 }} variant="h6" gutterBottom>
                  Matchup Table (past 3 months)
                </Typography>
                <Typography variant='body1'>
                  This includes all games played in the past 3 months.
                </Typography>
                <Typography p={2} variant="body1">
                  Win Rate
                </Typography>
                <Box component={Paper} sx={{ maxWidth: 350 }}>
                  <Typography p={2} variant='body1'>
                    {Utils.colorChangeForPercent(((matchups.total_wins / matchups.total_games) * 100).toFixed(2))} ( {matchups.total_wins} / {matchups.total_games} )
                  </Typography>
                </Box>
                <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={orderBy === 'character'}
                            direction={orderBy === 'character' ? order : 'asc'}
                            onClick={() => handleRequestSort('character')}
                          >
                            Character
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <TableSortLabel
                            active={orderBy === 'winrate'}
                            direction={orderBy === 'winrate' ? order : 'asc'}
                            onClick={() => handleRequestSort('winrate')}
                          >
                            WR
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <TableSortLabel
                            active={orderBy === 'wins'}
                            direction={orderBy === 'wins' ? order : 'asc'}
                            onClick={() => handleRequestSort('wins')}
                          >
                            Wins
                          </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                          <TableSortLabel
                            active={orderBy === 'total'}
                            direction={orderBy === 'total' ? order : 'asc'}
                            onClick={() => handleRequestSort('total')}
                          >
                            Total
                          </TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedMatchups.map((matchup, rowIndex) => (
                        <TableRow key={rowIndex}>
                          <TableCell component="th" scope="row" sx={{ position: 'sticky', left: 0, background: 'black', zIndex: 1 }}>
                            {matchup.char_name} ({matchup.char_short})
                          </TableCell>
                          <TableCell>
                            {Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2))}
                          </TableCell>
                          <TableCell>
                            {matchup.wins}
                          </TableCell>
                          <TableCell>
                            {matchup.total_games}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </React.Fragment>
            ) : null}
          </Box>
          <Box marginTop={25} sx={{ width: 300, overflowY: 'auto', minWidth: '200px' }}>
            {player && player.id !== BigInt(0) ? (
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
      )}
    </React.Fragment>
  );
};

interface ClaimDialogProps {
  playerId: BigInt;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  API_ENDPOINT: string;
}

const ClaimDialog: React.FC<ClaimDialogProps> = ({ playerId, setLoading, API_ENDPOINT }) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (isPolling) {
      timerRef.current = setInterval(() => {
        pollPlayer(playerId);
      }, 2000);
    } else if (timerRef && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [code, isPolling]);

  const handleClickOpen = async () => {

    //If 'key' is set in localstorage, just redirect to settings
    if (StorageUtils.getApiKey()) {
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

  function pollPlayer(playerId: BigInt) {
    if (counter.current >= 10) {
      if (timerRef && timerRef.current) {
        clearInterval(timerRef.current);
      }

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
          if (timerRef && timerRef.current) {
            clearInterval(timerRef.current);
          }

          setTimeout(() => {
            StorageUtils.setApiKey(resp);
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