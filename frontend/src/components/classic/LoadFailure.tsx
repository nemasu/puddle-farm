import { Typography } from "@mui/material";
import { getRequestPresentation } from "../../lib/server/site-preferences";

export async function LoadFailure({ subject }: { subject: string }) {
  const { language } = await getRequestPresentation();
  return (
    <Typography role="alert" color="error" sx={{ m: 3 }}>
      {language === "ja" ? (
        "データを読み込めませんでした。しばらくしてからお試しください。"
      ) : (
        <>Could not load {subject}. Please try again later.</>
      )}
    </Typography>
  );
}
