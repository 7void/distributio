import { runEnrichmentPipeline } from "@/lib/pipeline";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-pipeline-secret");
    if (!secret || secret !== process.env.PIPELINE_SECRET) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    await runEnrichmentPipeline();

    return Response.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pipeline run failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
