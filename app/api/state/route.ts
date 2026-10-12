import { auth } from "@/auth";
import { getState } from "@/lib/data";
import { withWorkspace } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Sign in required" }, { status: 401 });
  const email = session.user.email;
  try {
    return await withWorkspace(email, async () => Response.json(await getState(email)));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Workspace unavailable" }, { status: 500 });
  }
}
