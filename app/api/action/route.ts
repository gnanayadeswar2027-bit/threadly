import { auth } from "@/auth";
import { approveDraft, cancelSchedule, duplicateDraft, generateDrafts, getState, markPublished, moveLead, saveDraft, saveLead, scheduleDraft, updateContext, updateOpportunity } from "@/lib/data";
import { withWorkspace } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const email = session.user.email;
  try {
    const body = await request.json();
    if (["draft", "lead", "generate"].includes(body.action) && body.platform !== "X") return Response.json({error: "Only X is supported."}, {status:400});
    if (body.action === "generate") {
      await withWorkspace(email, () => getState(email));
      await generateDrafts(email, body.opportunityId, body.platform, body.tone);
      return Response.json({ ok: true });
    }
    return await withWorkspace(email, async () => {
      await getState(email);
      switch (body.action) {
        case "context": await updateContext(email, body.context, body.name); break;
        case "opportunity": await updateOpportunity(email, body.id, body.status); break;
        case "draft": await saveDraft(email, body); break;
        case "approve": await approveDraft(email, body.id); break;
        case "schedule": await scheduleDraft(email, body.id, body.date); break;
        case "cancelSchedule": await cancelSchedule(email, body.id); break;
        case "duplicate": await duplicateDraft(email, body.id); break;
        case "published": await markPublished(email, body.id); break;
        case "lead": await saveLead(email, body); break;
        case "moveLead": await moveLead(email, body.id, body.stage); break;
        default: return Response.json({ error: "Unknown action" }, { status: 400 });
      }
      return Response.json({ ok: true });
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Action failed" }, { status: 400 });
  }
}
