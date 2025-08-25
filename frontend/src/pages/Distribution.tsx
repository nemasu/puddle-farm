import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { DistributionResponse, DistributionResult } from '../interfaces/API';
import { Utils } from './../utils/Utils';

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
        Rank Distribution
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
                <TableCell>{Utils.getRankDisplayName(row.lower_bound)}</TableCell>
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

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Rank Thresholds
      </Typography>
      <Typography variant="body1" sx={{mb: 4}}>
        Rating requirements for each rank tier.
      </Typography>
      <TableContainer component={Paper} sx={{mb: 6}}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Rank</TableCell>
              <TableCell>Minimum Rating</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Utils.getRankThresholds().map((threshold, index) => (
              <TableRow key={index}>
                <TableCell>
                  <img 
                    src={`/${threshold.imageName}.png`} 
                    alt={`${threshold.name} rank`} 
                    title={threshold.name}
                    style={{ width: '50px', height: '50px' }} 
                  />
                  </TableCell>
                  <TableCell>{threshold.name}</TableCell>
                <TableCell>{threshold.rating.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default Distribution;