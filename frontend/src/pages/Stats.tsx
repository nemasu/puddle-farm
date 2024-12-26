import { CircularProgress } from '@mui/material';
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
import { useNavigate } from 'react-router-dom';
import { Utils } from './../utils/Utils';
import { StatsResponse } from '../interfaces/API';

let JSONParse: (arg0: string) => any;
import('json-with-bigint').then(module => {
  JSONParse = module.JSONParse;
});
/* global BigInt */

const Stats = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsResponse>();
  const [health, setHealth] = useState<String>("");

  useEffect(() => {
    document.title = 'Stats | Puddle Farm';
    window.scrollTo(0, 0);

    const fetchResults = async () => {
      setLoading(true);
      try {
        const url = API_ENDPOINT
          + '/stats';
        const response = await fetch(url);

        // eslint-disable-next-line
        const result = await response.text().then(body => {

          var parsed = JSONParse(body);

          setStats(parsed);

          return parsed;
        });

        const health_url = API_ENDPOINT
          + '/health';

        const health_response = await fetch(health_url);

        if (health_response.status === 200) {
          const result = await health_response.text().then(body => {
            return body;
          });
  
          setHealth(result);
          
        } else if (health_response.status === 500) {
          const result = await health_response.text().then(body => {
            return body;
          });

          setHealth("Error! "+ result);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    fetchResults();
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
            Stats
          </Typography>
        </Box>
      </AppBar>
      <Box m={4} maxWidth="700px">
        <Typography my={3} variant='h5'>Players</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Last Checked</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Past Month</TableCell>
                <TableCell>Past Week</TableCell>
                <TableCell>Past Day</TableCell>
                <TableCell>Past Hour</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats ?
                <TableRow>
                  <TableCell>{Utils.formatUTCToLocal(stats.timestamp)}</TableCell>
                  <TableCell>{stats.total_players.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_month_players.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_week_players.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_day_players.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_hour_players.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                </TableRow>
                : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <Box m={4} maxWidth="700px">
        <Typography my={3} variant='h5'>Games</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Last Checked</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Past Month</TableCell>
                <TableCell>Past Week</TableCell>
                <TableCell>Past Day</TableCell>
                <TableCell>Past Hour</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats ?
                <TableRow>
                  <TableCell>{Utils.formatUTCToLocal(stats.timestamp)}</TableCell>
                  <TableCell>{stats.total_games.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_month_games.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_week_games.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_day_games.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                  <TableCell>{stats.one_hour_games.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</TableCell>
                </TableRow>
                : null}
            </TableBody>
          </Table>
        </TableContainer>

        <Typography my={3} variant='h5'>Server Health</Typography>
        {health ? (
          <pre>{health}</pre>
        ) : null}
        <Typography my={10}>Statistics are updated once an hour.</Typography>
      </Box>
    </React.Fragment>
  );
};

export default Stats;