import RefreshIcon from "@mui/icons-material/Refresh";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import { type MouseEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HistoryRow from "../components/HistoryRow";
import Matchup from "../components/PlayerMatchup";
import RatingChart from "../components/RatingChart";
import { Tag } from "./../components/Tag";
import { usePlayerData } from "../hooks/usePlayerData";
import type {
  PlayerResponse,
  PlayerResponsePlayer,
  TagResponse,
} from "../interfaces/API";
import type { GroupedMatch } from "../interfaces/Player";
import { API_ENDPOINT } from "../utils/playerApi";
import {
  calcNextOffset,
  calcPrevOffset,
  findHighestRatedChar,
  isEmptyPlayer,
} from "../utils/playerUtils";
import { Utils } from "./../utils/Utils";

type LinkClickHandler = (event: MouseEvent<HTMLElement>, url: string) => void;

function PlayerHeader({
  player,
  currentCharData,
  alias,
}: {
  player: PlayerResponse | null;
  currentCharData: PlayerResponsePlayer | null;
  alias: string[];
}) {
  const navigate = useNavigate();

  const playerInfo = player ? (
    <>
      {player.tags && player.tags.length > 0 && (
        <Box>
          {player.tags.map((e) => (
            <Tag key={e.tag} style={JSON.parse(e.style)}>
              {e.tag}
            </Tag>
          ))}
        </Box>
      )}
      {currentCharData
        ? Utils.displayRankIcon(
            currentCharData.rating,
            "64px",
            currentCharData.is_legend,
          )
        : null}
      <Typography variant="playerName">{player.name}</Typography>
      <Typography variant="platform">{player.platform}</Typography>
      {player.top_global !== 0 ? (
        <Typography
          variant="global_rank"
          onMouseDown={(_event) => navigate("/top_global")}
          sx={{ cursor: "pointer" }}
        >
          #{player.top_global} Overall
        </Typography>
      ) : null}
    </>
  ) : null;

  const aliasSection =
    alias && alias.length > 0 ? (
      <Box sx={{ textAlign: "center", fontSize: 17 }}>
        <Typography
          variant="platform"
          sx={{
            position: "relative",
            top: "0px",
            marginTop: "10px",
            display: "inline-block",
          }}
        >
          AKA
        </Typography>
        <Box sx={{ m: 1, display: "inline-block" }}>
          {alias.map((item) => (
            <Typography
              key={item}
              variant="playerName"
              sx={{
                px: 0.8,
                py: 0.2,
                mx: 0.3,
                my: 0.2,
                display: "inline-block",
              }}
            >
              {item}
            </Typography>
          ))}
        </Box>
      </Box>
    ) : null;

  return (
    <AppBar
      position="static"
      style={{ backgroundImage: "none" }}
      sx={{ backgroundColor: "secondary.main" }}
    >
      <Box
        sx={{
          minHeight: { xs: 50, lg: 100 },
          paddingTop: { xs: 0, lg: "30px" },
        }}
      >
        <Typography
          align="center"
          variant="pageHeader"
          sx={{ fontSize: 30, marginTop: { xs: 2, lg: 0 } }}
        >
          {playerInfo}
        </Typography>
        {aliasSection}
      </Box>
    </AppBar>
  );
}

function CharacterStats({
  currentCharData,
  syncLoading,
  onRatingSync,
  onLinkClick,
}: {
  currentCharData: PlayerResponsePlayer;
  syncLoading: boolean;
  onRatingSync: () => void;
  onLinkClick: LinkClickHandler;
}) {
  return (
    <>
      <Typography variant="h5" sx={{ my: 2 }}>
        {currentCharData.character} Rating:{" "}
        <Box component={"span"}>
          {Utils.displayRating(currentCharData.rating)}
        </Box>{" "}
        ({currentCharData.match_count} games)
        <Tooltip title="Sync ratings from game">
          <IconButton
            onClick={onRatingSync}
            disabled={syncLoading}
            size="small"
            sx={{ ml: 1, color: "primary.main" }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {currentCharData.top_char !== 0 ? (
          <Typography
            variant="char_rank"
            onMouseDown={(event) =>
              onLinkClick(event, `/top/${currentCharData.char_short}`)
            }
            sx={{ cursor: "pointer" }}
          >
            #{currentCharData.top_char} {currentCharData.character}
          </Typography>
        ) : null}
      </Typography>
      {currentCharData.top_rating.value !== 0 ? (
        <Typography>
          Top Rating:{" "}
          <Box component={"span"}>
            {Utils.displayRating(currentCharData.top_rating.value)}
          </Box>{" "}
          ({Utils.formatUTCToLocal(currentCharData.top_rating.timestamp)})
        </Typography>
      ) : null}
      {currentCharData.top_defeated.value !== 0.0 ? (
        <Typography>
          Top Defeated:{" "}
          <Button
            sx={{ fontSize: "16px" }}
            component={Link}
            nativeButton={false}
            onMouseDown={(event) =>
              onLinkClick(
                event,
                `/player/${currentCharData.top_defeated.id}/${currentCharData.top_defeated.char_short}`,
              )
            }
          >
            {currentCharData.top_defeated.name} (
            {currentCharData.top_defeated.char_short})
          </Button>{" "}
          <Box component={"span"}>
            {Utils.displayRating(currentCharData.top_defeated.value)}
          </Box>{" "}
          ({Utils.formatUTCToLocal(currentCharData.top_defeated.timestamp)})
        </Typography>
      ) : null}
    </>
  );
}

function MatchHistory({
  filteredHistory,
  tags,
  showNext,
  onPrev,
  onNext,
}: {
  filteredHistory: GroupedMatch[];
  tags: { [key: string]: TagResponse[] };
  showNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <Box sx={{ mx: { xs: 1, lg: 3 }, mb: 2 }}>
        <Button onClick={onPrev}>Prev</Button>
        <Button style={showNext ? {} : { display: "none" }} onClick={onNext}>
          Next
        </Button>
      </Box>
      <Box sx={{ display: { xs: "block", lg: "none" } }}>
        {tags &&
          filteredHistory.map((item) => (
            <Box sx={{ py: 0.3 }} key={`${item.timestamp}-${item.opponent_id}`}>
              <HistoryRow
                item={item}
                isMobile={true}
                tags={tags[item.opponent_id.toString()]}
              />
            </Box>
          ))}
      </Box>
      <Box sx={{ display: { xs: "none", lg: "block" } }}>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell width="170px">Timestamp</TableCell>
                <TableCell width="120px" align="right">
                  Rating
                </TableCell>
                <TableCell>Opponent</TableCell>
                <TableCell align="right">Character</TableCell>
                <TableCell width="120px" align="right">
                  Rating
                </TableCell>
                <TableCell align="right">Result</TableCell>
                <TableCell align="right">Change</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tags &&
                filteredHistory.map((item) => (
                  <HistoryRow
                    key={`${item.timestamp}-${item.opponent_id}`}
                    item={item}
                    tags={tags[item.opponent_id.toString()]}
                  />
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      <Box sx={{ mx: { xs: 1, lg: 3 } }}>
        <Button onClick={onPrev}>Prev</Button>
        <Button style={showNext ? {} : { display: "none" }} onClick={onNext}>
          Next
        </Button>
      </Box>
    </>
  );
}

function PlayerSidebar({
  player,
  avatar,
  comment,
  onLinkClick,
}: {
  player: PlayerResponse | null;
  avatar: string | null;
  comment: string | null;
  onLinkClick: LinkClickHandler;
}) {
  return (
    <Box
      sx={{
        gridArea: "sidebar",
        display: { xs: "contents", lg: "flex" },
        flexDirection: { lg: "column" },
        overflowY: { lg: "auto" },
        minWidth: { lg: "200px" },
      }}
    >
      <Box sx={{ gridArea: { xs: "avatar", lg: "unset" } }}>
        {comment && (
          <Box
            sx={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "12px",
              marginTop: { xs: 0, lg: "10px" },
              marginBottom: "3px",
              marginLeft: "10px",
              marginRight: "10px",
              position: "relative",
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: "-8px",
                left: "50%",
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <Typography sx={{ fontSize: 13, wordWrap: "break-word" }}>
              {comment}
            </Typography>
          </Box>
        )}
        {avatar && (
          <img
            src={avatar}
            alt="Player Avatar"
            style={{ transform: "scale(0.5)" }}
          />
        )}
      </Box>
      <Box sx={{ gridArea: { xs: "sidebar", lg: "unset" } }}>
        {player && !isEmptyPlayer(player) ? (
          <>
            <hr />
            <Typography sx={{ fontSize: 14 }}>Characters:</Typography>
            {player.ratings?.map((item) => (
              <Box key={item.char_short}>
                <Button
                  variant="text"
                  onMouseDown={(event) =>
                    onLinkClick(
                      event,
                      `/player/${player.id}/${item.char_short}`,
                    )
                  }
                  sx={{ textAlign: "left", color: "white" }}
                >
                  <Typography component="div" sx={{ fontSize: 12.5, my: 0.3 }}>
                    <Box sx={{ display: { xs: "block", lg: "none" } }}>
                      {item.character}
                      <br />
                      {Utils.displayRankIcon(
                        item.rating,
                        "32px",
                        item.is_legend,
                      )}
                      <br />
                      {Utils.displayRating(item.rating)}
                      <br />({item.match_count} games)
                    </Box>
                    <Box sx={{ display: { xs: "none", lg: "block" } }}>
                      {item.character} {Utils.displayRating(item.rating)}{" "}
                      <Box
                        sx={{
                          display: "inline-flex",
                          position: "relative",
                          top: "16px",
                          marginLeft: "5px",
                        }}
                      >
                        {Utils.displayRankIcon(
                          item.rating,
                          "32px",
                          item.is_legend,
                        )}
                      </Box>
                      <br />({item.match_count} games)
                    </Box>
                  </Typography>
                </Button>
                <br />
              </Box>
            ))}
            <hr style={{ marginTop: 10 }} />
          </>
        ) : null}
      </Box>
    </Box>
  );
}

function SyncErrorDialog({
  syncError,
  onClose,
}: {
  syncError: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={syncError !== null}
      onClose={onClose}
      aria-labelledby="sync-error-dialog-title"
      aria-describedby="sync-error-dialog-description"
    >
      <DialogTitle id="sync-error-dialog-title">Rating Sync Error</DialogTitle>
      <DialogContent>
        <DialogContentText id="sync-error-dialog-description">
          {syncError}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} autoFocus>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const Player = () => {
  const navigate = useNavigate();

  const {
    player,
    currentCharData,
    alias,
    loading,
    showNext,
    tags,
    countdown,
    avatar,
    comment,
    filteredHistory,
    syncLoading,
    syncError,
    player_id_checked,
    char_short,
    count,
    offset,
    handleRatingSync,
    clearSyncError,
  } = usePlayerData();

  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger only
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [player_id_checked, char_short]);

  useEffect(() => {
    if (player && !isEmptyPlayer(player) && !char_short) {
      navigate(
        `/player/${player_id_checked}/${findHighestRatedChar(player.ratings)}`,
        { replace: true },
      );
    }
  }, [player, char_short, player_id_checked, navigate]);

  function onPrev() {
    const { count: c, offset: o } = calcPrevOffset(count, offset);
    navigate(`/player/${player_id_checked}/${char_short}/${c}/${o}`);
  }

  function onNext() {
    const { count: c, offset: o } = calcNextOffset(count, offset);
    navigate(`/player/${player_id_checked}/${char_short}/${c}/${o}`);
  }

  function onLinkClick(event: MouseEvent<HTMLElement>, url: string) {
    if (event.button === 1) {
      window.open(url, "_blank");
    } else if (event.button === 0) {
      navigate(url);
    }
  }

  return (
    <>
      {player && currentCharData && char_short && (
        <title>{`${player.name} (${char_short}) - ${Utils.displaySimpleRating(Number(currentCharData.rating))} | Puddle Farm`}</title>
      )}
      {loading ? (
        <CircularProgress
          size={60}
          variant="indeterminate"
          disableShrink={true}
          sx={{ position: "absolute", top: "-1px", color: "white" }}
        />
      ) : null}
      <PlayerHeader
        player={player}
        currentCharData={currentCharData}
        alias={alias}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateAreas: {
            xs: '"main" "avatar" "sidebar"',
            lg: '"main sidebar"',
          },
          gridTemplateColumns: { xs: "1fr", lg: "1fr 300px" },
          gridTemplateRows: { xs: "auto auto auto", lg: "1fr" },
          gap: { xs: 1, lg: 2 },
          p: { xs: 1, lg: 2 },
          overflow: "hidden",
        }}
      >
        <Box sx={{ gridArea: "main", overflow: "auto", minWidth: 0 }}>
          <Box>
            {currentCharData && (
              <CharacterStats
                currentCharData={currentCharData}
                syncLoading={syncLoading}
                onRatingSync={handleRatingSync}
                onLinkClick={onLinkClick}
              />
            )}
            {countdown !== null && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Auto-update in: {countdown} seconds
                </Typography>
              </Box>
            )}
            <MatchHistory
              filteredHistory={filteredHistory}
              tags={tags}
              showNext={showNext}
              onPrev={onPrev}
              onNext={onNext}
            />
          </Box>
          {currentCharData ? (
            <RatingChart
              player_id={player_id_checked}
              API_ENDPOINT={API_ENDPOINT}
              char_short={char_short}
              latest_rating={currentCharData.rating}
              total_games={currentCharData.match_count}
            />
          ) : null}
          <Matchup
            player_id={player_id_checked}
            API_ENDPOINT={API_ENDPOINT}
            char_short={char_short}
          />
        </Box>
        <PlayerSidebar
          player={player}
          avatar={avatar}
          comment={comment}
          onLinkClick={onLinkClick}
        />
      </Box>
      <SyncErrorDialog syncError={syncError} onClose={clearSyncError} />
    </>
  );
};

export default Player;
