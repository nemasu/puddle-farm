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
import { JSONParse } from 'json-with-bigint';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Tag } from './Tag';

// eslint-disable-next-line
/* global BigInt */

const TopGlobal = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const defaultCount = 100;

  const navigate = useNavigate();

  const [ranking, setRanking] = useState([]);

  const [showNext, setShowNext] = useState(true);

  let { count, offset } = useParams();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchRanking = async () => {
      setLoading(true);
      try {
        const url = API_ENDPOINT
          + '/top?'
          + 'count=' + (count ? count : defaultCount)
          + '&offset=' + (offset ? offset : 0);
        const response = await fetch(url);

        // eslint-disable-next-line
        const result = await response.text().then(body => {

          var parsed = JSONParse(body);

          for (var key in parsed.ranks) {
            parsed.ranks[key].rating = parsed.ranks[key].rating.toFixed(2);
            parsed.ranks[key].deviation = parsed.ranks[key].deviation.toFixed(2);
            if (parsed.ranks[key].tags) {
              for (var s in parsed.ranks[key].tags) {
                parsed.ranks[key].tags[s].style = JSON.parse(parsed.ranks[key].tags[s].style);
              }
            }
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
  }, [count, offset, API_ENDPOINT]);

  function onPrev(event) {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) - parseInt(nav_count) : 0;
    if (nav_count < 0) {
      nav_count = defaultCount;
    }
    if (nav_offset < 0) {
      nav_offset = 0;
    }
    navigate(`/top_global/${nav_count}/${nav_offset}`);
  }

  function onNext(event) {
    let nav_count = count ? parseInt(count) : defaultCount;
    let nav_offset = offset ? parseInt(offset) + parseInt(nav_count) : nav_count;
    navigate(`/top_global/${nav_count}/${nav_offset}`);
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
            Top Players
          </Typography>
        </Box>
      </AppBar>
      <Box m={4}>
        <Box sx={{ display: 'inline-block' }}>
          <Button onClick={(event) => onPrev(event)}>Prev</Button>
          <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
          <Button onClick={() => navigate(`/top_global/1000/0`)}>View All</Button>
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
                    <Button component={Link} variant="link" to={`/player/${player.id}/${player.char_short}`}>{player.name}</Button>
                    {player.tags && player.tags.map((e, i) => (
                      <Tag key={i} style={e.style} sx={{ fontSize: '0.9rem', position: 'unset' }}>
                        {e.tag}
                      </Tag>
                    ))}
                  </TableCell>
                  <TableCell>{player.char_short}</TableCell>
                  <TableCell><Box component={'span'} title={player.rating}>{Number(player.rating).toFixed(0)}</Box> <Box component={'span'} title={player.deviation}>±{Number(player.deviation).toFixed(0)}</Box></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: 'inline-block' }}>
          <Button onClick={(event) => onPrev(event)}>Prev</Button>
          <Button style={showNext ? {} : { display: 'none' }} onClick={(event) => onNext(event)}>Next</Button>
          <Button onClick={() => navigate(`/top_global/1000/0`)}>View All</Button>
        </Box>

      </Box>
    </React.Fragment>
  );
};

export default TopGlobal;