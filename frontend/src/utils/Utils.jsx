import { Typography } from "@mui/material";
import { StorageUtils } from "./Storage";
import React from "react";

const rankThresholds = [
  { rating: 45000, name: 'Vanquisher', imageName: 'vanq' },
  { rating: 40800, name: 'Diamond 3', imageName: 'diamond' },
  { rating: 36000, name: 'Diamond 2', imageName: 'diamond' },
  { rating: 32400, name: 'Diamond 1', imageName: 'diamond' },
  { rating: 28400, name: 'Platinum 3', imageName: 'platinum' },
  { rating: 24400, name: 'Platinum 2', imageName: 'platinum' },
  { rating: 20400, name: 'Platinum 1', imageName: 'platinum' },
  { rating: 18000, name: 'Gold 3', imageName: 'gold' },
  { rating: 15600, name: 'Gold 2', imageName: 'gold' },
  { rating: 13200, name: 'Gold 1', imageName: 'gold' },
  { rating: 11000, name: 'Silver 3', imageName: 'silver' },
  { rating: 8800, name: 'Silver 2', imageName: 'silver' },
  { rating: 6600, name: 'Silver 1', imageName: 'silver' },
  { rating: 5400, name: 'Bronze 3', imageName: 'bronze' },
  { rating: 4200, name: 'Bronze 2', imageName: 'bronze' },
  { rating: 3000, name: 'Bronze 1', imageName: 'bronze' },
  { rating: 2000, name: 'Iron 3', imageName: 'iron' },
  { rating: 1000, name: 'Iron 2', imageName: 'iron' },
  { rating: 0, name: 'Iron 1', imageName: 'iron' }
];

const Utils = {
  getRankThresholds: () => rankThresholds,
  getRankName: (rating) => {
    for (const threshold of rankThresholds) {
      if (rating >= threshold.rating) {
        return threshold.imageName;
      }
    }
    return "iron";
  },
  getRankDisplayName: (rating) => {
    for (const threshold of rankThresholds) {
      if (rating >= threshold.rating) {
        return threshold.name;
      }
    }
    return "Iron 1";
  },
  convertRating: (rating) => {
    if (rating > 10000000) {
      return Number(rating) - 10000000;
    }
    return Number(rating);
  },
  displaySimpleRating: (rating) => {
    const convertedRating = Utils.convertRating(rating);
    if (convertedRating > 10000000) {
      return `${convertedRating} DR`;
    }
    return `${convertedRating} RP`;
  },
  displayRating: (rating) => {
    const convertedRating = Utils.convertRating(rating);
    const rankImageName = Utils.getRankName(rating);
    const rankDisplayName = Utils.getRankDisplayName(rating);
    var suffix = " RP";
    if (rating > 10000000) {
      suffix = " DR";
    }

    return (
      <Typography
        variant={"span"}
        sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
      >
        {convertedRating} {suffix}
        <img
          src={`/${rankImageName}.png`}
          alt={`${rankDisplayName} rank`}
          title={rankDisplayName}
          style={{ width: "20px", height: "20px" }}
        />
      </Typography>
    );
  },
  formatUTCToLocal: (dateTimeString) => {
    if (dateTimeString === "Now") {
      return dateTimeString;
    }

    if (StorageUtils.getUseLocalTime()) {
      const utcDateTimeString = dateTimeString.trim();
      const utcDate = new Date(utcDateTimeString + "Z");

      const localYear = utcDate.getFullYear();
      const localMonth = String(utcDate.getMonth() + 1).padStart(2, "0");
      const localDay = String(utcDate.getDate()).padStart(2, "0");
      const localHours = String(utcDate.getHours()).padStart(2, "0");
      const localMinutes = String(utcDate.getMinutes()).padStart(2, "0");
      const localSeconds = String(utcDate.getSeconds()).padStart(2, "0");

      const localDateString = `${localYear}-${localMonth}-${localDay} ${localHours}:${localMinutes}:${localSeconds}`;

      return `${localDateString}`;
    }
    return dateTimeString;
  },
  colorChangeForRating: (change) => {
    if (StorageUtils.getDisableRatingColors()) {
      return <React.Fragment>{change}</React.Fragment>;
    }
    if (change <= -10) {
      // Lower than -10
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#D32F2F",
          }}
        >
          {change}
        </Typography>
      );
    } else if (change <= -2) {
      // Between -10 and -2
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#E57373",
          }}
        >
          {change}
        </Typography>
      );
    } else if (change < 0) {
      // Between -2 and 0
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#FF8A80",
          }}
        >
          {change}
        </Typography>
      );
    } else if (change <= 2) {
      // Between 0 and 2
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#A8E6A3",
          }}
        >
          +{change}
        </Typography>
      );
    } else if (change <= 10) {
      // Between 2 and 10
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#4CAF50",
          }}
        >
          +{change}
        </Typography>
      );
    } else {
      // Greater than 10
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#087F23",
          }}
        >
          +{change}
        </Typography>
      );
    }
  },
  colorChangeForPercent: (percent) => {
    if (percent > 55) {
      // Greater than 55%
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#087F23",
          }}
        >
          {percent}%
        </Typography>
      );
    } else if (percent > 51) {
      // Between 51 and 55 (not inclusive)
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#A8E6A3",
          }}
        >
          {percent}%
        </Typography>
      );
    } else if (percent >= 49 && percent <= 51) {
      // Between 49 and 51 (inclusive)
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#A0BFF0",
          }}
        >
          {percent}%
        </Typography>
      ); // Gold color for 49-51%
    } else if (percent > 45) {
      // Between 45 and 49 (not inclusive)
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#FF8A80",
          }}
        >
          {percent}%
        </Typography>
      );
    } else {
      // Less than or equal to 45%
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#D32F2F",
          }}
        >
          {percent}%
        </Typography>
      );
    }
  },
};

export { Utils };
