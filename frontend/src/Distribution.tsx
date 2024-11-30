import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { DistributionResponse, DistributionResult } from './Interfaces';
import { Utils } from './Utils';

const Distribution = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [loading, setLoading] = React.useState(true);

  const [distribution, setDistribution] = React.useState<DistributionResponse>();

  useEffect(() => {
    document.title = 'Distribution | Puddle Farm';
    fetch(`${API_ENDPOINT}/distribution`)
      .then((response) => response.json())
      .then((data) => {
        setDistribution(data);
      });

      setLoading(false);

  }, [API_ENDPOINT]);

  return (
    <Box m={5}>
      {loading ?
        <CircularProgress
          size={60}
          variant="indeterminate"
          disableShrink={true}
          sx={{ position: 'absolute', top: '-1px', color: 'white' }}
        />
        : null
      }
      <Typography variant="h6" gutterBottom>
        Floor
      </Typography>
      <Typography variant="body1" sx={{mb: 4}}>
        This table shows the distribution of players across different floors for the past month.
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Floor</TableCell>
              <TableCell>Player Count</TableCell>
              <TableCell>Percentage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distribution && distribution.data.distribution_floor.map((row: number[], index: number) => (
              <TableRow key={index}>
                <TableCell>{row[0] == 99 ? 'Celestial' : row[0]}</TableCell>
                <TableCell>{row[1]}</TableCell>
                <TableCell>{(row[1] / distribution.data.one_month_players).toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Rating
      </Typography>
      <Typography variant="body1" sx={{mb: 4}}>
        This table shows the current distribution of players across different ratings.
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Count</TableCell>
              <TableCell>Percentage</TableCell>
              <TableCell>Percentile</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distribution && distribution.data.distribution_rating.map((row: DistributionResult, index: number) => (
              <TableRow key={index}>
                <TableCell>{row.lower_bound}</TableCell>
                <TableCell>{row.upper_bound}</TableCell>
                <TableCell>{row.count}</TableCell>
                <TableCell>{row.percentage.toFixed(2)}%</TableCell>
                <TableCell>{row.percentile.toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ my: 5 }}>
        {distribution && (
          <Typography variant="body1">
            Statistics are updated once a day.<br />
            Last updated: {Utils.formatUTCToLocal(distribution.timestamp)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default Distribution;