import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { DistributionResponse, DistributionResult } from '../interfaces/API';
import { Utils } from './../utils/Utils';

const getRankName = (rating: number): string => {
  if (rating >= 45000) return 'Vanquisher';
  if (rating >= 40800) return 'Diamond 3';
  if (rating >= 36000) return 'Diamond 2';
  if (rating >= 32400) return 'Diamond 1';
  if (rating >= 28400) return 'Platinum 3';
  if (rating >= 24400) return 'Platinum 2';
  if (rating >= 20400) return 'Platinum 1';
  if (rating >= 18000) return 'Gold 3';
  if (rating >= 15600) return 'Gold 2';
  if (rating >= 13200) return 'Gold 1';
  if (rating >= 11000) return 'Silver 3';
  if (rating >= 8800) return 'Silver 2';
  if (rating >= 6600) return 'Silver 1';
  if (rating >= 5400) return 'Bronze 3';
  if (rating >= 4200) return 'Bronze 2';
  if (rating >= 3000) return 'Bronze 1';
  if (rating >= 2000) return 'Iron 3';
  if (rating >= 1000) return 'Iron 2';
  return 'Iron 1';
};

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
    <Box m={5} sx={{maxWidth: '700px'}}>
      {loading ?
        <CircularProgress
          size={60}
          variant="indeterminate"
          disableShrink={true}
          sx={{ position: 'absolute', top: '-1px', color: 'white' }}
        />
        : null
      }
      

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Rank
      </Typography>
      <Typography variant="body1" sx={{mb: 4}}>
        This table shows the current distribution of players across different ranks.
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rank</TableCell>
              <TableCell>Count</TableCell>
              <TableCell>Percentage</TableCell>
              <TableCell>Percentile</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {distribution && distribution.data.distribution_rating.map((row: DistributionResult, index: number) => (
              <TableRow key={index}>
                <TableCell>{getRankName(row.lower_bound)}</TableCell>
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