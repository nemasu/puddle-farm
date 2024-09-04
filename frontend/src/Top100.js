import React, { useState, useEffect } from 'react';
import AppBar from '@mui/material/AppBar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextButton from '@mui/material/Button';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { JSONParse, JSONStringify } from 'json-with-bigint';

/* global BigInt */

const Top100 = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [ranking, setRanking] = useState([]);
  
  let { game_count, offset } = useParams();
  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const response = await fetch(API_ENDPOINT
          + '/top?'
          + 'game_count=' + (game_count ? game_count : '100')
          + '&offset=' + (offset ? offset : '0'));
          const result = await response.text().then(body => {
          
          var parsed = JSONParse(body);

          for( var key in parsed.ranks ) {
            parsed.ranks[key].rating = parsed.ranks[key].rating.toFixed(2);
            parsed.ranks[key].deviation = parsed.ranks[key].deviation.toFixed(2);
          }

          setRanking(parsed.ranks);

          return parsed;
        });

      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    fetchRanking();
  }, []);

  return (
    <React.Fragment>
      <AppBar position="static"
        style={{backgroundImage: "none"}}
        sx={{backgroundColor:"secondary.main"}}
      >
        <Box sx={{minHeight:100, paddingTop:'30px'}}>
        <Typography align='center' variant="h4">
          Top 100 Players
        </Typography>
        </Box>
      </AppBar>
      <Box m={4} maxWidth="700px">
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Character</TableCell>
                <TableCell>Rating</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ranking.map((player, index) => (
                <TableRow key={index}>
                  <TableCell>{player.rank}</TableCell>
                  <TableCell><TextButton component={Link} variant="link" to={`/player/${player.id}/${player.char_short}`}>{player.name}</TextButton></TableCell>
                  <TableCell>{player.char_short}</TableCell>
                  <TableCell>{player.rating} ±{player.deviation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </React.Fragment>
  );
};

export default Top100;