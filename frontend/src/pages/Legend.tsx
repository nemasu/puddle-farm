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
import { Link } from 'react-router-dom';
import { Tag } from './../components/Tag';
import { JSONParse } from '../utils/JSONParse';
import { Utils } from '../utils/Utils';

const Legend = () => {
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

  interface Player {
    rank: number;
    id: string;
    name: string;
    char_short: string;
    rating: number;
    tags?: { style: React.CSSProperties; tag: string }[];
  }

  const [ranking, setRanking] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextUpdateIn, setNextUpdateIn] = useState<number | null>(null);

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  useEffect(() => {
    const id = setInterval(() => {
      setNextUpdateIn(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.title = 'Legend Players | Puddle Farm';
    window.scrollTo(0, 0);

    const fetchRanking = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetch(API_ENDPOINT + '/top_legend?count=100');

        if (!response.ok) {
          const text = await response.text();
          setErrorMessage(text || `Error ${response.status}`);
          setLoading(false);
          return;
        }

        const result = await response.text().then(body => {
          var parsed = JSONParse(body);

          for (var key in parsed.ranks) {
            if (parsed.ranks[key].tags) {
              for (var s in parsed.ranks[key].tags) {
                parsed.ranks[key].tags[s].style = JSON.parse(parsed.ranks[key].tags[s].style);
              }
            }
          }

          setRanking(parsed.ranks);

          if (parsed.last_update) {
            const lastUpdate = new Date(parsed.last_update + 'Z');
            const secondsLeft = Math.floor((lastUpdate.getTime() + 3600_000 - Date.now()) / 1000);
            setNextUpdateIn(secondsLeft);
          }

          return parsed;
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching legend data:', error);
        setErrorMessage('Could not connect to the API.');
        setLoading(false);
      }
    };

    fetchRanking();
  }, [API_ENDPOINT]);

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
            Legend Players
          </Typography>
        </Box>
      </AppBar>
      <Box m={3}>
        {errorMessage && <Typography color="error" align="center" sx={{ mb: 2 }}>{errorMessage}</Typography>}
        {nextUpdateIn !== null && (
          <Typography align="center" sx={{ mb: 1 }}>
            {nextUpdateIn > 0 ? `Next update in: ${formatCountdown(nextUpdateIn)}` : 'Updating...'}
          </Typography>
        )}
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
                    {player.tags && player.tags.map((e: { style: React.CSSProperties | undefined; tag: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, i: React.Key | null | undefined) => (
                      <Tag key={i} style={e.style} sx={{ fontSize: '0.9rem', position: 'unset' }}>
                        {e.tag}
                      </Tag>
                    ))}
                  </TableCell>
                  <TableCell>{player.char_short}</TableCell>
                  <TableCell>
                    <Box component={'span'} sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      {Utils.displayRankIcon(player.rating, "32px", true)}
                      <Box component={'span'} title={String(player.rating)}>{Utils.displayRating(player.rating)}</Box>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </React.Fragment>
  );
};

export default Legend;
