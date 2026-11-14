import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { StatsResponse } from "../../interfaces/API";
import { Utils } from "../../utils/Utils";

import { PlayerDateTime } from "./PlayerFormatting";
export function StatsTables({ data }: { data: StatsResponse }) {
  const stats = data;

  if (!stats) return null;

  return (
    <>
      <Box sx={{ m: { xs: 1, sm: 4 }, maxWidth: "700px" }}>
        <Typography sx={{ my: 3 }} variant="h5">
          Ranked Players
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
                <TableCell>
                  <PlayerDateTime value={stats.timestamp} />
                </TableCell>
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
      <Box sx={{ m: { xs: 1, sm: 4 }, maxWidth: "700px" }}>
        <Typography sx={{ my: 3 }} variant="h5">
          Ranked Games
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
                <TableCell>
                  <PlayerDateTime value={stats.timestamp} />
                </TableCell>
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
}
