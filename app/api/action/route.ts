import { auth } from "@/auth";
import { approveDraft, cancelSchedule, duplicateDraft, generateDrafts, getState, markPublished, moveLead, saveDraft, saveLead, saveManualOpportunity, scheduleDraft, updateContext, updateOpportunity } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const email = session.user.email;
  try {
    await getState(email);
    const body = await request.json();
    switch (body.action) {
      case "context": await updateContext(email, body.context, body.name); break;
      case "opportunity": await updateOpportunity(email, body.id, body.status); break;
      case "manualOpportunity":
        if (email === "demo@threadly.app" && process.env.NODE_ENV === "production") return Response.json({ error: "This public demo cannot store private notes. Sign in to your own workspace." }, { status: 403 });
        await saveManualOpportunity(email, body);
        break;
      case "draft": await saveDraft(email, body); break;
      case "approve": await approveDraft(email, body.id); break;
      case "schedule": await scheduleDraft(email, body.id, body.date); break;
      case "cancelSchedule": await cancelSchedule(email, body.id); break;
      case "duplicate": await duplicateDraft(email, body.id); break;
      case "published": await markPublished(email, body.id); break;
      case "lead": await saveLead(email, body); break;
      case "moveLead": await moveLead(email, body.id, body.stage); break;
      case "generate": await generateDrafts(email, body.opportunityId, body.platform, body.tone); break;
      default: return Response.json({ error: "Unknown action" }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Action failed" }, { status: 400 });
  }
}
