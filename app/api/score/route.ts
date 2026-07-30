import { scoreCities } from "@/lib/score";
import type { ExtractedFeatures, ProductProfile } from "@/lib/types";

interface ScorePayload {
  features: ExtractedFeatures;
  profile?: ProductProfile;
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

    const scores = await scoreCities(payload.features, payload.profile);
    return Response.json(scores);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scoring calculation failed.";
    return Response.json({ message }, { status: 500 });
  }
}
