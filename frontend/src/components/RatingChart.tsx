import React, { useEffect } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField, Typography } from '@mui/material';
import { RatingChartProps } from '../interfaces/Player';
import { Utils } from '../utils/Utils';
import { LineChartData } from '../interfaces/Player';
import { RatingsResponse } from "../interfaces/API";

let ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend;
import('chart.js').then(module => {
  ChartJS = module.Chart;
  CategoryScale = module.CategoryScale;
  LinearScale = module.LinearScale;
  PointElement = module.PointElement;
  LineElement = module.LineElement;
  Title = module.Title;
  Tooltip = module.Tooltip;
  Legend = module.Legend;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );
});

let Line: React.ComponentType<any>;
import('react-chartjs-2').then(module => {
  Line = module.Line;
});

const RatingChart: React.FC<RatingChartProps> = ({ player_id, char_short, API_ENDPOINT }) => {

  const [lineChartData, setLineChartData] = React.useState<LineChartData | null>(null);
  const [duration, setDuration] = React.useState<string>('100');
  const [customGames, setCustomGames] = React.useState<string>('');
  const [tempGames, setTempGames] = React.useState<string>('');
  const [openDialog, setOpenDialog] = React.useState(false);

  const handleDurationChange = (event: SelectChangeEvent) => {
    setDuration(event.target.value);
  };

  const handleOpenDialog = () => {
    setTempGames(customGames);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleTempGamesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempGames(event.target.value);
  };

  const handleApplyCustomGames = () => {
    const games = parseInt(tempGames);
    if (!isNaN(games) && games > 0) {
      setCustomGames(tempGames);
      setDuration(tempGames);
      handleCloseDialog();
    }
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Rating History (' + duration + ' games)',
      },
    },
    scales: {
      x: {
        ticks: {
          display: false,
        }
      }
    }
  };

  useEffect(() => {
    const fetchChartData = async () => {
      if (duration === undefined || duration === '') {
        return;
      }

      const rating_history_response = await fetch(API_ENDPOINT + '/ratings/' + player_id + '/' + char_short + '/' + duration);
      if (rating_history_response.status === 200) {
        const rating_history_result = await rating_history_response.json();

        if (rating_history_result !== null && char_short !== null) {

          rating_history_result.reverse();

          const lineChartData = {
            labels: rating_history_result.map((item: RatingsResponse) => Utils.formatUTCToLocal(item.timestamp)),
            datasets: [
              {
                label: 'Rating',
                data: rating_history_result.map((item: RatingsResponse) => Utils.convertRating(item.rating)),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
              },
            ],
          };

          setLineChartData(lineChartData);
        }
      }
    }
    fetchChartData();
  }, [player_id, char_short, API_ENDPOINT, duration]);

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 5 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Game Count</InputLabel>
          <Select
            value={duration}
            label="Games"
            onChange={handleDurationChange}
          >
            <MenuItem value="100">100</MenuItem>
            <MenuItem value="200">200</MenuItem>
            <MenuItem value="300">300</MenuItem>
            <MenuItem value="400">400</MenuItem>
            <MenuItem value="500">500</MenuItem>
            <MenuItem value={customGames} onClick={handleOpenDialog}>Custom...</MenuItem>
          </Select>
        </FormControl>

        <Dialog open={openDialog} onClose={handleCloseDialog} disableScrollLock={true}>
          <DialogTitle>Custom Game Count</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus={false}
              label="Number of Games"
              type="number"
              value={tempGames}
              onChange={handleTempGamesChange}
              inputProps={{
                min: 1
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleApplyCustomGames}>Apply</Button>
          </DialogActions>
        </Dialog>
      </Box>

      {lineChartData ? (
        <Line options={lineChartOptions} data={lineChartData} />
      ) : (
        <Typography>Loading...</Typography>
      )}
    </React.Fragment>
  );
}

export default RatingChart;