import { auth, signIn, signOut } from "@/auth";
import Workspace from "@/components/Workspace";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth();
  if (!session?.user?.email) {
    return <main className="welcome">
      <div className="welcome-top"><span className="brand-mark">✳</span><strong>threadly<span className="brand-dot">.</span></strong><span className="welcome-tag">AI GTM COPILOT FOR FOUNDERS</span></div>
      <div className="welcome-content"><div className="eyebrow"><span className="pulse-dot"/> FOUNDER-LED GROWTH, REIMAGINED</div><h1>Turn customer<br/><em>conversations</em><br/>into your next<br/>customers<span className="accent-period">.</span></h1><p>Find the conversations that matter. Show up with something useful to say. Turn genuine engagement into your next growth channel.</p><div className="welcome-actions">{(process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_LOGIN === "true") && <form action={async () => { "use server"; await signIn("credentials", { email: "demo@threadly.app", password: "demo", redirectTo: "/" }); }}><button className="btn btn-dark" type="submit">Explore the demo <span>↗</span></button></form>}{process.env.AUTH_GOOGLE_ID && <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}><button className="btn btn-outline" type="submit">Sign in with Google</button></form>}</div><div className="welcome-note"><span className="tiny-dot"/> A live product demo with clearly marked sample conversations</div></div>
      <div className="welcome-preview"><div className="preview-header"><span>YOUR GTM, IN FOCUS</span><span>X DISCOVERY</span></div><div className="preview-rows"><div><span className="preview-emoji">🔥</span><strong>A customer problem on X</strong><small>X · Public posts</small></div><div><span className="preview-emoji">✦</span><strong>A response worth writing</strong><small>Tailored to your voice</small></div><div><span className="preview-emoji">↗</span><strong>A relationship worth tracking</strong><small>From signal to lead</small></div></div></div>
    </main>;
  }
  return <Workspace email={session.user.email} name={session.user.name || "Founder"} signOutAction={async () => { "use server"; await signOut({ redirectTo: "/" }); }} />;
}
