import { Typography } from "@mui/material";
import { Utils } from "../utils/Utils";

function PercentChangeLabel({ percent }: { percent: number }) {
  return (
    <Typography
      component="span"
      variant="inherit"
      sx={{
        paddingRight: "3px",
        display: "inline",
        fontSize: "0.875rem",
        color: Utils.getPercentChangeColor(percent),
      }}
    >
      {percent.toFixed(2)}%
    </Typography>
  );
}

export { PercentChangeLabel };
