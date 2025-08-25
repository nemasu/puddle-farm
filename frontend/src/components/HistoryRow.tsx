import { Box, TableContainer, Paper, Table, TableBody, TableRow, TableCell, IconButton, Button, Collapse, TableHead } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { TagResponse } from "../interfaces/API";
import { GroupedMatch } from "../interfaces/Player";
import { Utils } from "../utils/Utils";
import { Tag } from "./Tag";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

function HistoryRow(props: { isMobile?: boolean; item?: GroupedMatch; tags?: TagResponse[]; }) {
  const [open, setOpen] = React.useState(false);

  const { item, tags } = props;

  if (!item) return null;

  const formatTimestamp = (timestamp: string) => {
    const [date, time] = Utils.formatUTCToLocal(timestamp).split(' ');
    return (
      <React.Fragment>
        <Box sx={{ p: 0, m: 0 }}>
          {date}
        </Box>
        <Box sx={{ p: 0, m: 0 }}>
          {time}
        </Box>
      </React.Fragment>
    );
  };

  if (props.isMobile) {
    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableBody>
            {item.opponent_id === BigInt(0) ? (
              <React.Fragment>
                <TableRow>
                  <TableCell sx={{ pb: 0, mb: 0 }}>
                    <IconButton
                      aria-label="expand row"
                      size="small"
                      onClick={() => setOpen(!open)}
                    >
                      {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}>{formatTimestamp(item.timestamp)}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.wins} - {item.losses}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ px: 0, mx: 0 }} colSpan={2}><Button component={Link} sx={{ marginLeft: '5px' }} to={``}>{item.opponent_name}</Button></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.matches[0].opponent_character}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
                </TableRow>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <TableRow>
                  <TableCell sx={{ p: 0, m: 0 }}>
                    <IconButton
                      aria-label="expand row"
                      size="small"
                      onClick={() => setOpen(!open)}
                    >
                      {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}>{formatTimestamp(item.timestamp)}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }} width={90}> {Utils.displayRating(item.matches[item.matches.length - 1].own_rating_value)}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.wins} - {item.losses}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ px: 0, mx: 0, maxWidth: '120px' }}>
                    <Button sx={{ marginLeft: '5px' }} component={Link} to={`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`}>{item.opponent_name}</Button>
                    <React.Fragment>
                      <Box>
                        {tags && tags.map((e: TagResponse, i: number) => (
                          <Tag key={i} style={JSON.parse(e.style)} sx={{ fontSize: '0.9rem' }}>
                            {e.tag}
                          </Tag>
                        ))}
                      </Box>
                    </React.Fragment>
                  </TableCell>
                  <TableCell>
                    {Utils.displayRankIcon(item.matches[item.matches.length - 1].opponent_rating_value, '32px')}
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>
                    {Utils.displayRating(item.matches[item.matches.length - 1].opponent_rating_value)}
                  </TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>{item.matches[0].opponent_character_short}</TableCell>
                  <TableCell sx={{ px: 0, mx: 0 }}>
                    {Utils.colorChangeForRating(item.ratingChange)}
                  </TableCell>
                </TableRow>
              </React.Fragment>
            )}
            <TableRow id={item.timestamp}>
              <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                <Collapse in={open} timeout="auto" unmountOnExit>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Timestamp</TableCell>
                        <TableCell align="right">Rating</TableCell>
                        <TableCell align="right">Opponent Rating</TableCell>
                        <TableCell align="right">Winner?</TableCell>
                        <TableCell align="right">Rating Change</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.matches.map((item, i) => (
                        <TableRow key={item.timestamp}>
                          {item.opponent_id === BigInt("0") ? (
                            <React.Fragment>
                              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                              <TableCell align="right"></TableCell>
                              <TableCell align="right"></TableCell>
                              <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                              <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                            </React.Fragment>
                          ) : (
                            <React.Fragment>
                              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                              <TableCell align="right">{Utils.displayRating(item.own_rating_value)}</TableCell>
                              <TableCell align="right">{Utils.displayRating(item.opponent_rating_value)}</TableCell>
                              <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                              <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                            </React.Fragment>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Collapse>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  } else {
    return (
      <React.Fragment>
        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
          <TableCell>
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          {item.opponent_id === BigInt("0") ? (
            <React.Fragment>
              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
              <TableCell align="right"></TableCell>
              <TableCell><Button component={Link} to={``}>{item.opponent_name}</Button></TableCell>
              <TableCell align="right">{item.matches[0].opponent_character}</TableCell>
              <TableCell align="right"></TableCell>
              <TableCell align="right">{item.wins} - {item.losses}</TableCell>
              <TableCell align="right"></TableCell>
              <TableCell align="right"></TableCell>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
              <TableCell align="right"><Box component={'span'}>{Utils.displayRating(item.matches[item.matches.length - 1].own_rating_value)}</Box></TableCell>
              <TableCell >
                <Button component={Link} to={`/player/${item.opponent_id}/${item.matches[0].opponent_character_short}`}>{item.opponent_name}</Button>
                <React.Fragment>
                  <Box>
                    {tags && tags.map((e: TagResponse, i: number) => (
                      <Tag key={i} style={JSON.parse(e.style)} sx={{ fontSize: '0.9rem', position: 'unset' }}>
                        {e.tag}
                      </Tag>
                    ))}
                  </Box>
                </React.Fragment>
              </TableCell>
              <TableCell align="right">{item.matches[0].opponent_character}</TableCell>
              <TableCell align="right"><Box component={'span'}>{Utils.displayRankIcon(item.matches[item.matches.length - 1].opponent_rating_value, '32px')} {Utils.displayRating(item.matches[item.matches.length - 1].opponent_rating_value)}</Box></TableCell>
              <TableCell align="right">{item.wins} - {item.losses}</TableCell>
              <TableCell align="right">
                {Utils.colorChangeForRating(item.ratingChange)}
              </TableCell>
            </React.Fragment>
          )}
        </TableRow>
        <TableRow id={item.timestamp}>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell align="right">Rating</TableCell>
                    <TableCell align="right">Opponent Rating</TableCell>
                    <TableCell align="right">Winner?</TableCell>
                    <TableCell align="right">Rating Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {item.matches.map((item, i) => (
                    <TableRow key={item.timestamp}>
                      {item.opponent_id === BigInt(0) ? (
                        <React.Fragment>
                          <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                          <TableCell align="right"></TableCell>
                          <TableCell align="right"></TableCell>
                          <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                          <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                        </React.Fragment>
                      ) : (
                        <React.Fragment>
                          <TableCell component="th" scope="row">{Utils.formatUTCToLocal(item.timestamp)}</TableCell>
                          <TableCell align="right">{Utils.displayRating(item.own_rating_value)}</TableCell>
                          <TableCell align="right">{Utils.displayRating(item.opponent_rating_value)}</TableCell>
                          <TableCell align="right">{item.result_win ? 'Y' : 'N'}</TableCell>
                          <TableCell align='right'>{item.ratingChange > 0 ? '+' : ''}{item.ratingChange}</TableCell>
                        </React.Fragment>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Collapse>
          </TableCell>
        </TableRow>
      </React.Fragment >
    );
  }
}

export default HistoryRow;