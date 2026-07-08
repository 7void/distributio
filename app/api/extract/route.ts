import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedFeatures } from "@/lib/types";

const systemPrompt = `You are a distribution intelligence engine for India. Extract structured product features from the user description. Return ONLY valid JSON with no explanation, no markdown, no code fences. Use exactly this schema:
{
  productName, category, priceINR, priceSegment (mass/mid/premium/luxury),
  incomeWeight, retailWeight, internetWeight, coldWeight (all 0-1, sum to 1.0),
  affordability (0.5-1.1), targetAudience, needsColdChain (boolean),
  distributionLevel (0/1/2/3), distributionType (intensive/selective/exclusive),
  distributorProfile (direct/retailer/wholesaler/broker-agent),
  channels (string array), keyInsight (string)
}
Weight rules: high price = high incomeWeight. Cold chain product = high coldWeight. Online/D2C = high internetWeight. Mass FMCG = high retailWeight. Affordability: under ₹100=1.1, ₹100-500=1.0, ₹500-2000=0.85, ₹2000-10000=0.70, above ₹10000=0.55

PRICE SEGMENT WEIGHT GUIDANCE (these are soft guidelines, not hard overrides — use judgment based on the full product context):

- luxury (typically above ₹50,000): incomeWeight should almost always be highest. These products are genuinely gated by purchasing power. Exception: a luxury product sold purely online may share top weight with internetWeight.

- premium (₹2,000–₹50,000): incomeWeight should be significant (0.25–0.40) but does not need to be the single highest weight. A ₹15,000 phone sold via EMI through retail stores should weight retailWeight and internetWeight competitively alongside income. A ₹15,000 luxury handbag should weight income higher.

- mid and mass: incomeWeight can be low. Distribution reach (retailWeight) and channel (internetWeight, coldWeight) should dominate based on product type.

Use the product description, category, and channel context — not price alone — to determine the dominant weight.`;

function getPrompt(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "prompt" in payload &&
    typeof payload.prompt === "string"
  ) {
    return payload.prompt;
  }

  return null;
}

function parseJson(text: string): ExtractedFeatures {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return a JSON object.");
  }

  return JSON.parse(trimmed.slice(start, end + 1)) as ExtractedFeatures;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "your_key_here") {
      throw new Error("Missing GEMINI_API_KEY in .env.local.");
    }

    const prompt = getPrompt(await request.json());

    if (!prompt) {
      return Response.json({ message: "Prompt is required." }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return Response.json(parseJson(text));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Feature extraction failed.";

    return Response.json({ message }, { status: 500 });
  }
}
