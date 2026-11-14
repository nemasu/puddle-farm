import type { MatchupResponse } from "../../../interfaces/API";
import { matchupsCsv } from "../../../lib/matchups-csv";
import { readJson } from "../../../lib/server/api";

export async function GET() {
  try {
    return new Response(
      matchupsCsv(await readJson<MatchupResponse>("/matchups")),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="ggst-matchups.csv"',
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return new Response("Could not load matchup export.", { status: 503 });
  }
}
