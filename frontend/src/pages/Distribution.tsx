import React, { useEffect } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
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
  const [combinedMode, setCombinedMode] = React.useState(false);
  const chartRef = React.useRef<any>(null);

  const getRankColor = (rankName: string): string => {
    const lowerRankName = rankName.toLowerCase();
    if (lowerRankName.includes('iron')) return '#838fa4';
    if (lowerRankName.includes('bronze')) return '#cc8c4e';
    if (lowerRankName.includes('silver')) return '#b8cde6';
    if (lowerRankName.includes('gold')) return '#f0db3b';
    if (lowerRankName.includes('platinum')) return '#56e4bc';
    if (lowerRankName.includes('diamond')) return '#cfbfeb';
    if (lowerRankName.includes('vanquisher')) return '#ae71f8';
    return 'rgba(54, 162, 235, 0.6)';
  };

  const getBorderColor = (rankName: string): string => {
    const baseColor = getRankColor(rankName);
    return baseColor;
  };

  const combineRankData = (data: DistributionResult[]) => {
    const combined: { [key: string]: { count: number, percentage: number, percentile: number, lower_bound: number } } = {};
    
    data.forEach(entry => {
      const rankName = Utils.getRankDisplayName(entry.lower_bound);
      const baseRank = rankName.split(' ')[0]; // Get 'Gold' from 'Gold 1'
      
      if (!combined[baseRank]) {
        combined[baseRank] = {
          count: 0,
          percentage: 0,
          percentile: 0,
          lower_bound: entry.lower_bound
        };
      }
      
      combined[baseRank].count += entry.count;
      combined[baseRank].percentage += entry.percentage;
    });
    
    // Calculate percentiles for combined data
    const combinedArray = Object.entries(combined).map(([name, data]) => ({
      name,
      count: data.count,
      percentage: data.percentage,
      lower_bound: data.lower_bound
    }));
    
    // Sort by lower_bound to calculate cumulative percentiles
    combinedArray.sort((a, b) => a.lower_bound - b.lower_bound);
    
    let cumulativePercentage = 0;
    combinedArray.forEach(item => {
      cumulativePercentage += item.percentage;
      (combined[item.name] as any).percentile = 100 - cumulativePercentage;
    });
    
    return combined;
  };

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
        
        updateChartData(data);
      });

      setLoading(false);

  }, [API_ENDPOINT]);

  const updateChartData = (data: DistributionResponse) => {
    const distributionData = data.data.distribution_rating.filter((entry: DistributionResult) => entry.upper_bound !== 1);
    
    let chartLabels: string[];
    let chartDataValues: number[];
    let chartColors: string[];
    let chartBorderColors: string[];
    
    if (combinedMode) {
      const combined = combineRankData(distributionData);
      const sortedCombined = Object.entries(combined).sort(([, a], [, b]) => a.lower_bound - b.lower_bound);
      
      chartLabels = sortedCombined.map(([name]) => name);
      chartDataValues = sortedCombined.map(([, data]) => data.count);
      chartColors = chartLabels.map(label => getRankColor(label));
      chartBorderColors = chartLabels.map(label => getBorderColor(label));
    } else {
      chartLabels = distributionData.map((entry: DistributionResult) => Utils.getRankDisplayName(entry.lower_bound));
      chartDataValues = distributionData.map((entry: DistributionResult) => entry.count);
      chartColors = chartLabels.map(label => getRankColor(label));
      chartBorderColors = chartLabels.map(label => getBorderColor(label));
    }
    
    const newChartData = {
      labels: chartLabels,
      datasets: [
        {
          label: 'Players',
          data: chartDataValues,
          backgroundColor: chartColors,
          borderColor: chartBorderColors,
          borderWidth: 1,
        },
      ],
    };
    
    setChartData(newChartData);
  };

  React.useEffect(() => {
    if (distribution) {
      updateChartData(distribution);
    }
  }, [combinedMode, distribution]);

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
      <Typography variant="body1" sx={{mb: 2}}>
        This table shows the current distribution of players across different ranks.
      </Typography>
      
      <Button 
        variant="outlined" 
        onClick={() => setCombinedMode(!combinedMode)}
        sx={{ mb: 4 }}
      >
        {combinedMode ? 'Show Subdivisions' : 'Combine Ranks'}
      </Button>
      
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