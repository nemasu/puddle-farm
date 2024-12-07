import { CircularProgress, Button } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
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
import { PlayerSearchResponse } from '../interfaces/API';

let JSONParse: (arg0: string) => any;
import('json-with-bigint').then(module => {
  JSONParse = module.JSONParse;
});
// eslint-disable-next-line
/* global BigInt */

const Search = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const navigate = useNavigate();

  let { search_string, exact } = useParams();

  const [results, setResults] = useState<PlayerSearchResponse[]>([]);

  const [loading, setLoading ] = useState(true);

  useEffect(() => {
    document.title = 'Search Results | Puddle Farm';
    window.scrollTo(0, 0);

    const fetchResults = async () => {
      setLoading(true);
      try {
        const url = API_ENDPOINT
          + '/player/search?'
          + 'search_string=' + search_string
          + '&exact=' + ((exact && exact === 'exact') ? 'true' : 'false');
        const response = await fetch(url);

        // eslint-disable-next-line
        const result = await response.text().then(body => {
          
          var parsed = JSONParse(body);
          
          setResults(parsed.results);

          return parsed;
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    fetchResults();
  }, [search_string, exact, API_ENDPOINT]);

  return (
    <React.Fragment>
      <AppBar position="static"
        style={{backgroundImage: "none"}}
        sx={{backgroundColor:"secondary.main"}}
      >
        { loading ?
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: 'absolute', top:'-1px', color:'white' }}
          />
          : null
        }
        <Box sx={{minHeight:100, paddingTop:'30px'}}>
        <Typography align='center' variant="pageHeader">
          Search Results
        </Typography>
        </Box>
      </AppBar>
      <Box m={4} maxWidth="700px">
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell>Character</TableCell>
                <TableCell>Rating</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.map((player, index) => (
                <TableRow key={index}>
                  <TableCell><Button component={Link} to={`/player/${player.id}/${player.char_short}`}>{player.name}</Button></TableCell>
                  <TableCell>{player.char_short}</TableCell>
                  <TableCell><Box component={'span'} title={player.rating.toString()}>{Number(player.rating).toFixed(0)}</Box> <Box component={'span'} title={player.deviation.toString()}>±{Number(player.deviation).toFixed(0)}</Box></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </React.Fragment>
  );
};

export default Search;