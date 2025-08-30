import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { DistributionResponse, DistributionResult } from '../interfaces/API';
import { Utils } from './../utils/Utils';

let ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend;
import('chart.js').then(module => {
  ChartJS = module.Chart;
  CategoryScale = module.CategoryScale;
  LinearScale = module.LinearScale;
  BarElement = module.BarElement;
  Title = module.Title;
  Tooltip = module.Tooltip;
  Legend = module.Legend;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
  );
});

let Bar: React.ComponentType<any>;
import('react-chartjs-2').then(module => {
  Bar = module.Bar;
});

const Distribution = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [loading, setLoading] = React.useState(true);

  const [distribution, setDistribution] = React.useState<DistributionResponse>();
  const [chartData, setChartData] = React.useState<any>(null);
  const chartRef = React.useRef<any>(null);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Rank Distribution',
        color: '#fff',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Players'
        },
        ticks: {
          color: '#fff',
          font: {
            size: 12
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Rank'
        },
        ticks: {
          color: '#fff',
          font: {
            size: 12
          },
          maxRotation: 45,
          minRotation: 45
        }
      }
    },
  };

  useEffect(() => {
    document.title = 'Distribution | Puddle Farm';
    fetch(`${API_ENDPOINT}/distribution`)
      .then((response) => response.json())
      .then((data) => {
        setDistribution(data);
        
        const distributionData = data.data.distribution_rating.filter((entry: DistributionResult) => entry.upper_bound !== 1);
        
        const chartData = {
          labels: distributionData.map((entry: DistributionResult) => Utils.getRankDisplayName(entry.lower_bound)),
          datasets: [
            {
              label: 'Players',
              data: distributionData.map((entry: DistributionResult) => entry.count),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
          ],
        };
        
        setChartData(chartData);
      });

      setLoading(false);

  }, [API_ENDPOINT]);

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      
      {chartData && Bar && (
        <Box sx={{ mb: 4, height: '350px', minWidth: '300px', width: '100%' }}>
          <Bar ref={chartRef} options={chartOptions} data={chartData} />
        </Box>
      )}

      {distribution && distribution.data.distribution_rating.filter((entry: DistributionResult) => entry.upper_bound === 1).map((row: DistributionResult, index: number) => (
        <Typography key={index} sx={{marginBottom: '8px'}}>Players in Placement: {row.count}</Typography>
      ))}
      
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
            {distribution && distribution.data.distribution_rating.filter((entry: DistributionResult) => entry.upper_bound !== 1).map((row: DistributionResult, index: number) => (
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
                  {Utils.displayRankIcon(threshold.rating, "64px")}
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