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
import { getClassicMessages } from "../../lib/i18n/classic";
import type { Language } from "../../lib/site-preferences";
import { Utils } from "../../utils/Utils";

import { PlayerDateTime } from "./PlayerFormatting";
export function StatsTables({
  data,
  language = "en",
}: {
  data: StatsResponse;
  language?: Language;
}) {
  const stats = data;
  const messages = getClassicMessages(language).stats;

  if (!stats) return null;

  return (
    <>
      <Box sx={{ m: { xs: 1, sm: 4 }, maxWidth: "700px" }}>
        <Typography sx={{ my: 3 }} variant="h5">
          {messages.players}
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{messages.checked}</TableCell>
                <TableCell>{messages.total}</TableCell>
                <TableCell>{messages.month}</TableCell>
                <TableCell>{messages.week}</TableCell>
                <TableCell>{messages.day}</TableCell>
                <TableCell>{messages.hour}</TableCell>
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
          {messages.games}
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{messages.checked}</TableCell>
                <TableCell>{messages.total}</TableCell>
                <TableCell>{messages.month}</TableCell>
                <TableCell>{messages.week}</TableCell>
                <TableCell>{messages.day}</TableCell>
                <TableCell>{messages.hour}</TableCell>
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
        <Typography sx={{ my: 10 }}>{messages.updated}</Typography>
      </Box>
    </>
  );
}
