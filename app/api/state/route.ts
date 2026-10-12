import { auth } from "@/auth";
import { getState } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) return Response.json({ error: "Sign in required" }, { status: 401 });
  try {
    return Response.json(await getState(session.user.email));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Workspace unavailable" }, { status: 500 });
  }
}
