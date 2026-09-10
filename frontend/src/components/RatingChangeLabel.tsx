import { Typography } from "@mui/material";
import { StorageUtils } from "../utils/storage";
import { Utils } from "../utils/Utils";

function RatingChangeLabel({ change }: { change: number }) {
  if (StorageUtils.getDisableRatingColors()) {
    return <>{change}</>;
  }
  return (
    <Typography
      component="span"
      variant="inherit"
      sx={{
        paddingRight: "3px",
        display: "inline",
        fontSize: "0.875rem",
        color: Utils.getRatingChangeColor(change),
      }}
    >
      {change >= 0 ? "+" : ""}
      {change}
    </Typography>
  );
}

export { RatingChangeLabel };
