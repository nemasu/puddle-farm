import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { type ComponentType, useEffect, useRef, useState } from "react";
import type {
  DistributionResponse,
  DistributionResult,
} from "../interfaces/API";
import { Utils } from "./../utils/Utils";

// biome-ignore lint/suspicious/noImplicitAnyLet: dynamic chart.js import assigned after module loads
let ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend;
import("chart.js").then((module) => {
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
    Legend,
  );
});

// biome-ignore lint/suspicious/noExplicitAny: dynamic react-chartjs-2 import, Bar type unavailable at module level
let Bar: ComponentType<any>;
import("react-chartjs-2").then((module) => {
  Bar = module.Bar;
});

const Distribution = () => {
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

  const [loading, setLoading] = useState(true);

  const [distribution, setDistribution] = useState<DistributionResponse>();
  // biome-ignore lint/suspicious/noExplicitAny: chart.js data shape varies by config
  const [chartData, setChartData] = useState<any>(null);
  const [combinedMode, setCombinedMode] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: chart.js ref type requires dynamic import
  const chartRef = useRef<any>(null);

  const getBorderColor = (rankName: string): string => {
    const baseColor = Utils.getRankColor(rankName);
    return baseColor;
  };

  const combineRankData = (data: DistributionResult[]) => {
    const combined: {
      [key: string]: {
        count: number;
        percentage: number;
        percentile: number;
        lower_bound: number;
      };
    } = {};

    data.forEach((entry) => {
      const rankName = Utils.getRankDisplayName(entry.lower_bound);
      const baseRank = rankName.split(" ")[0]; // Get 'Gold' from 'Gold 1'

      if (!combined[baseRank]) {
        combined[baseRank] = {
          count: 0,
          percentage: 0,
          percentile: 0,
          lower_bound: entry.lower_bound,
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
      lower_bound: data.lower_bound,
    }));

    // Sort by lower_bound to calculate cumulative percentiles
    combinedArray.sort((a, b) => a.lower_bound - b.lower_bound);

    let cumulativePercentage = 0;
    combinedArray.forEach((item) => {
      combined[item.name].percentile = 100 - cumulativePercentage;
      cumulativePercentage += item.percentage;
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
        text: "Rank Distribution",
        color: "#fff",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Number of Players",
        },
        ticks: {
          color: "#fff",
          font: {
            size: 12,
          },
        },
      },
      x: {
        title: {
          display: true,
          text: "Rank",
        },
        ticks: {
          color: "#fff",
          font: {
            size: 12,
          },
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  const updateChartData = (data: DistributionResponse) => {
    const distributionData = data.data.distribution_rating.filter(
      (entry: DistributionResult) => entry.upper_bound !== 1,
    );

    let chartLabels: string[];
    let chartDataValues: number[];
    let chartColors: string[];
    let chartBorderColors: string[];

    if (combinedMode) {
      const combined = combineRankData(distributionData);
      const sortedCombined = Object.entries(combined).sort(
        ([, a], [, b]) => a.lower_bound - b.lower_bound,
      );

      chartLabels = sortedCombined.map(([name]) => name);
      chartDataValues = sortedCombined.map(([, data]) => data.count);
      chartColors = chartLabels.map((label) =>
        Utils.getRankColor(
          label === "Vanquisher" ? "Vanquisher III Vindex" : `${label} 3`,
        ),
      );
      chartBorderColors = chartLabels.map((label) =>
        getBorderColor(
          label === "Vanquisher" ? "Vanquisher III Vindex" : `${label} 3`,
        ),
      );
    } else {
      chartLabels = distributionData.map((entry: DistributionResult) =>
        Utils.getRankDisplayName(entry.lower_bound),
      );
      chartDataValues = distributionData.map(
        (entry: DistributionResult) => entry.count,
      );
      chartColors = chartLabels.map((label) => Utils.getRankColor(label));
      chartBorderColors = chartLabels.map((label) => getBorderColor(label));
    }

    const newChartData = {
      labels: chartLabels,
      datasets: [
        {
          label: "Players",
          data: chartDataValues,
          backgroundColor: chartColors,
          borderColor: chartBorderColors,
          borderWidth: 1,
        },
      ],
    };

    setChartData(newChartData);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on mount only
  useEffect(() => {
    document.title = "Distribution | Puddle Farm";
    fetch(`${API_ENDPOINT}/distribution`)
      .then((response) => response.json())
      .then((data) => {
        setDistribution(data);

        updateChartData(data);
      });

    setLoading(false);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: updateChartData recreated each render; combinedMode in deps triggers re-run on mode change
  useEffect(() => {
    if (distribution) {
      updateChartData(distribution);
    }
  }, [distribution, combinedMode]);

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Box sx={{ m: 5, maxWidth: "700px" }}>
      {loading ? (
        <CircularProgress
          size={60}
          variant="indeterminate"
          disableShrink={true}
          sx={{ position: "absolute", top: "-1px", color: "white" }}
        />
      ) : null}
      <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
        Rank Distribution
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This table shows the current distribution of players across different
        ranks.
      </Typography>

      <Button
        variant="outlined"
        onClick={() => setCombinedMode(!combinedMode)}
        sx={{ mb: 4 }}
      >
        {combinedMode ? "Show Subdivisions" : "Combine Ranks"}
      </Button>

      {chartData && Bar && (
        <Box sx={{ mb: 4, height: "350px", minWidth: "300px", width: "100%" }}>
          <Bar ref={chartRef} options={chartOptions} data={chartData} />
        </Box>
      )}

      {distribution?.data.distribution_rating
        .filter((entry: DistributionResult) => entry.upper_bound === 1)
        .map((row: DistributionResult) => (
          <Typography key={row.lower_bound} sx={{ marginBottom: "8px" }}>
            Players in Placement: {row.count}
          </Typography>
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
            {distribution?.data.distribution_rating
              .filter((entry: DistributionResult) => entry.upper_bound !== 1)
              .map((row: DistributionResult) => (
                <TableRow key={row.lower_bound}>
                  <TableCell>
                    {Utils.getRankDisplayName(row.lower_bound)}
                  </TableCell>
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
            Statistics are updated once a day.
            <br />
            Last updated: {Utils.formatUTCToLocal(distribution.timestamp)}
          </Typography>
        )}
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Rank Thresholds
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Rating requirements for each rank tier.
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 6 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Rank</TableCell>
              <TableCell>Minimum Rating</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{Utils.displayRankIcon(0, "64px", true)}</TableCell>
              <TableCell>Imperius</TableCell>
              <TableCell>Top 100</TableCell>
            </TableRow>
            {Utils.getRankThresholds().map((threshold) => (
              <TableRow key={threshold.rating}>
                <TableCell>
                  {Utils.displayRankIcon(threshold.rating, "64px")}
                </TableCell>
                <TableCell>{threshold.name}</TableCell>
                <TableCell>
                  {threshold.rating >= 10000000
                    ? `${(threshold.rating - 10000000).toLocaleString()} DR`
                    : `${threshold.rating.toLocaleString()} RP`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Distribution;
