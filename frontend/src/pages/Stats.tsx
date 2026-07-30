import { CircularProgress } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Suspense, use, useEffect, useState } from "react";
import type { StatsResponse } from "../interfaces/API";
import { JSONParse } from "../utils/JSONParse";
import { Utils } from "./../utils/Utils";

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

function fetchStats(): Promise<StatsResponse | undefined> {
  return fetch(`${API_ENDPOINT}/stats`)
    .then((res) => res.text())
    .then((body) => JSONParse(body) as StatsResponse)
    .catch(() => undefined);
}

function fetchHealth(): Promise<string> {
  return fetch(`${API_ENDPOINT}/health`)
    .then(async (res) => {
      if (res.ok) return await res.text();
      return `Error! ${await res.text()}`;
    })
    .catch(() => "");
}

const StatsTables = ({
  data,
}: {
  data: Promise<StatsResponse | undefined>;
}) => {
  const stats = use(data);

  if (!stats) return null;

  return (
    <>
      <Box sx={{ m: 4, maxWidth: "700px" }}>
        <Typography sx={{ my: 3 }} variant="h5">
          Players
        </Typography>
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
              <TableRow>
                <TableCell>{Utils.formatUTCToLocal(stats.timestamp)}</TableCell>
                <TableCell>{Utils.formatNumber(stats.total_players)}</TableCell>
                <TableCell>
                  {Utils.formatNumber(stats.one_month_players)}
                </TableCell>
                <TableCell>
                  {Utils.formatNumber(stats.one_week_players)}
                </TableCell>
                <TableCell>
                  {Utils.formatNumber(stats.one_day_players)}
                </TableCell>
                <TableCell>
                  {Utils.formatNumber(stats.one_hour_players)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <Box sx={{ m: 4, maxWidth: "700px" }}>
        <Typography sx={{ my: 3 }} variant="h5">
          Games
        </Typography>
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
              <TableRow>
                <TableCell>{Utils.formatUTCToLocal(stats.timestamp)}</TableCell>
                <TableCell>{Utils.formatNumber(stats.total_games)}</TableCell>
                <TableCell>
                  {Utils.formatNumber(stats.one_month_games)}
                </TableCell>
                <TableCell>
                  {Utils.formatNumber(stats.one_week_games)}
                </TableCell>
                <TableCell>{Utils.formatNumber(stats.one_day_games)}</TableCell>
                <TableCell>
                  {Utils.formatNumber(stats.one_hour_games)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Typography sx={{ my: 10 }}>
          Statistics are updated once an hour.
        </Typography>
      </Box>
    </>
  );
};

const HealthDisplay = ({ data }: { data: Promise<string> }) => {
  const health = use(data);

  if (!health) return null;

  return (
    <>
      <Box component="span">Health: </Box>
      <Box component="span">{health}</Box>
    </>
  );
};

const Stats = () => {
  const [statsPromise] = useState(() => fetchStats());
  const [healthPromise] = useState(() => fetchHealth());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <title>Stats | Puddle Farm</title>
      <AppBar
        position="static"
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >
        <Box
          sx={{
            minHeight: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography align="center" variant="pageHeader">
            Stats
          </Typography>
        </Box>
      </AppBar>
      <Suspense
        fallback={
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: "absolute", top: "-1px", color: "white" }}
          />
        }
      >
        <StatsTables data={statsPromise} />
      </Suspense>
      <Box sx={{ m: 4 }}>
        <Suspense fallback={null}>
          <HealthDisplay data={healthPromise} />
        </Suspense>
      </Box>
    </>
  );
};

export default Stats;
