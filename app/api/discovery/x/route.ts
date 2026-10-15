import { auth } from "@/auth";
import { getState, storeXResults } from "@/lib/data";
import { withWorkspace } from "@/lib/db";
import { topicFromContext } from "@/lib/x-discovery";

import { searchX } from "@/lib/apify-x";

export const maxDuration = 90;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const email = session.user.email;
  if (process.env.NODE_ENV === "production" && email === "demo@threadly.app") {
    return Response.json({ error: "Live search needs a private workspace. Sign in to your own account." }, { status: 403 });
  }
  try {
    const body = await request.json();
    const state = await withWorkspace(email, () => getState(email));
    const topic = body?.topic || topicFromContext(state.workspace.context);
    const result = await searchX(topic);
    await withWorkspace(email, () => storeXResults(email, result.posts, result.provider));
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 400 });
  }
}
