# Threadly

Responsive founder-led GTM workspace. The local demo uses clearly labeled sample conversations and an embedded PostgreSQL-compatible database. User edits, drafts, calendar items, and leads persist in `.threadly-data/` locally. New non-demo workspaces start empty.

## Run locally

```bash
cd threadly
npm install
npm run dev
```

Open http://localhost:3000 and choose **Explore demo**. Set `OPENAI_API_KEY` in `.env.local` to enable live draft generation. Without it, the preloaded sample draft remains editable and approvable; the app does not pretend a new AI result was generated.

The Supabase project is `jiikixgbkzbysdbfspbt` (Mumbai). Its Threadly schema is in `supabase/migrations/20261012064606_threadly_initial_schema.sql`. For hosting, copy the **Transaction pooler** URI from the project's **Connect** panel, replace its password placeholder, append `?sslmode=require`, and set the result as the private `DATABASE_URL` environment variable. Set `AUTH_SECRET` as well. Do not commit the connection string. The embedded database is for local development only. Google sign-in can be enabled with `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

GitHub access to Supabase does not supply the app's runtime database credentials. The app continues to use NextAuth for sign-in; Supabase Auth is not configured. The Threadly tables have row level security enabled and do not grant direct browser access through Supabase's Data API. Apply the migration before pointing a hosted app at this database.

The shared demo login is disabled in production unless `ALLOW_DEMO_LOGIN=true` is explicitly set. A hosted demo with that setting must use only sample data. Production demo accounts cannot save user-provided Reddit notes; use a private signed-in workspace and persistent database for that workflow. Do not put private information into a shared demo.

Reddit, LinkedIn, and X are sample sources until each platform's approved API access and scopes are configured. You can manually save a Reddit post link with your own title and summary, then attach it to a draft or lead. Threadly does not fetch Reddit content. Reddit's commercial use requires separate approval/contract; do not enable automated Reddit discovery without it. Planning a date without a publishing connection creates a manual reminder; it never posts automatically.
