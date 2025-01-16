import { CircularProgress } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Tag } from './../components/Tag';
import { PlayerRankResponse } from '../interfaces/API';
import { JSONParse } from '../utils/JSONParse';

const TopPlayer = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const defaultCount = 100;

  const navigate = useNavigate();

  const [ranking, setRanking] = useState<PlayerRankResponse[]>([]);

  const [showNext, setShowNext] = useState<boolean>(true);

  let { char_short, count, offset } = useParams();

  const [charLong, setCharLong] = useState<string>();

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchRanking = async () => {
      setLoading(true);
      try {

        const url = API_ENDPOINT
          + '/top_char/' + char_short
          + '?count=' + (count ? count : defaultCount)
          + '&offset=' + (offset ? offset : 0);
        const response = await fetch(url);

        if (response.status === 404) {
          navigate(`/`);
          return;
        }

        // eslint-disable-next-line
        const result = await response.text().then(body => {

          var parsed = JSONParse(body);

          if (parsed.ranks.length === 0) {
            //navigate(`/`);
            setCharLong("???");
            setRanking([]);
            return;
          }

          setCharLong(parsed.ranks[0].char_long);

          document.title = 'Top ' + parsed.ranks[0].char_long + ' Players | Puddle Farm';

          for (var key in parsed.ranks) {
            parsed.ranks[key].rating = parsed.ranks[key].rating.toFixed(2);
            parsed.ranks[key].deviation = parsed.ranks[key].deviation.toFixed(2);
          }

          if (parsed.ranks.length < (count ? count : defaultCount) || parsed.ranks.length === 1000) {
            setShowNext(false);
          } else {
            setShowNext(true);
          }

          setRanking(parsed.ranks);

          return parsed;
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    fetchRanking();
  }, [char_short, count, offset, API_ENDPOINT]);

  function onPrev() {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) - nav_count : 0;
    if (nav_count < 0) {
      nav_count = defaultCount;
    }
    if (nav_offset < 0) {
      nav_offset = 0;
    }
    navigate(`/top/${char_short}/${nav_count}/${nav_offset}`);
  }

  function onNext() {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) + nav_count : nav_count;
    navigate(`/top/${char_short}/${nav_count}/${nav_offset}`);
  }

  return (
    <React.Fragment>
      <AppBar position="static"
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >
        {loading ?
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: 'absolute', top: '-1px', color: 'white' }}
          />
          : null
        }
        <Box sx={{ minHeight: 100, paddingTop: '30px' }}>
          <Typography align='center' variant="pageHeader">
            {charLong} Leaderboard
          </Typography>
        </Box>
      </AppBar>
      <Box m={4}>
        <Box mx={3} sx={{ display: 'inline-block' }}>
          <Button onClick={() => onPrev()}>Prev</Button>
          <Button style={showNext ? {} : { display: 'none' }} onClick={() => onNext()}>Next</Button>
          <Button onClick={() => navigate(`/top/${char_short}/1000/0`)}>View All</Button>
        </Box>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Char</TableCell>
                <TableCell>Rating</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranking.map((player, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ px: 0, mx: 0, textAlign: 'center' }}>{player.rank}</TableCell>
                  <TableCell>
                    <Button component={Link} to={`/player/${player.id}/${player.char_short}`}>{player.name}</Button>
                    {player.tags && player.tags.map((e, i) => (
                      <Tag key={i} style={JSON.parse(e.style)} sx={{ fontSize: '0.9rem', position: 'unset' }}>
                        {e.tag}
                      </Tag>
                    ))}
                  </TableCell>
                  <TableCell>{player.char_short}</TableCell>
                  <TableCell><Box component={'span'} title={player.rating.toString()}>{Number(player.rating).toFixed(0)}</Box> <Box component={'span'} title={player.deviation.toString()}>±{Number(player.deviation).toFixed(0)}</Box></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box mx={3} sx={{ display: 'inline-block' }}>
          <Button onClick={() => onPrev()}>Prev</Button>
          <Button style={showNext ? {} : { display: 'none' }} onClick={() => onNext()}>Next</Button>
          <Button onClick={() => navigate(`/top/${char_short}/1000/0`)}>View All</Button>
        </Box>
      </Box>
    </React.Fragment>
  );
};

export default TopPlayer;