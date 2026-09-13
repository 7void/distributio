import { scoreCities } from "@/lib/score";
import type { CompetitionIntelligence, ExtractedFeatures, ProductProfile } from "@/lib/types";
import { getCities } from "@/db/queries";

interface ScorePayload {
  features: ExtractedFeatures;
  profile?: ProductProfile;
  competitionIntelligence?: CompetitionIntelligence;
}

function isScorePayload(payload: unknown): payload is ScorePayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "features" in payload &&
    typeof (payload as any).features === "object"
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!isScorePayload(payload)) {
      return Response.json(
        { message: "features is required in payload." },
        { status: 400 }
      );
    }

    let cityData;
    try {
      const dbCities = await getCities();
      if (dbCities && dbCities.length > 0) {
        cityData = dbCities;
      }
    } catch {
      // Fallback handled inside scoreCities default parameter
    }

    const scores = scoreCities(
      payload.features,
      payload.profile,
      payload.competitionIntelligence,
      cityData
    );
    return Response.json(scores);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scoring calculation failed.";
    return Response.json({ message }, { status: 500 });
  }
}
