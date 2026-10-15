# Threadly

X-only conversation discovery for startup founders. Enter a short customer problem, search real public X posts, review original sources in Radar, then write and approve a response. Phrase matches are research material, not verified buyers.

## Run locally

```bash
npm install
npm run dev -- --port 3010
```

Open http://localhost:3010 and choose Explore demo. Local records persist in `.threadly-data/`. New workspaces start empty. Old sample and non-X records are excluded from the app. No publishing integration is enabled; calendar dates are manual reminders.

## X data connection

Set server-only `APIFY_TOKEN` in ignored `.env.local`. The backend uses [API Dojo’s X scraper](https://apify.com/apidojo/twitter-scraper-lite) through Apify REST API. It requests one exact-phrase search covering the last seven days, up to 10 posts, and a $0.10 maximum run charge. Provider credits are required. Each run has a 60-second provider timeout; a timeout may leave partial results in Apify and is shown as an error, never fake data. No automatic paid retries.

`POST /api/discovery/x` requires an authenticated workspace and accepts `{ "topic": "customer onboarding" }`. Search results are persisted from the server response, deduplicated by X post ID within the workspace, and appear in Radar. Original post URLs, text and observed metrics are preserved. Missing metrics remain unavailable. Saved/dismissed statuses survive repeat searches.

Apify is preferred when its token is configured. If only `X_BEARER_TOKEN` is configured, the backend uses the official X recent-search API. It does not silently switch providers on failure. Production shared demo accounts cannot initiate paid searches.

```bash
npm run check:x -- "customer onboarding"
npm test
npm run typecheck
npm run build
```

The connection check makes one paid-provider request and prints only a count, query and source URL. Tokens stay on the server and must never use `NEXT_PUBLIC_` names. Set `OPENAI_API_KEY` for AI drafts; manual drafting works without it.

## Hosting and database status

The Supabase project is `jiikixgbkzbysdbfspbt` (Mumbai). Its schema and provider-ready tables are managed by the migrations in `supabase/migrations/`. The least-privilege `threadly_app` database role is intentionally `NOLOGIN` until hosting is configured. Later, set its login password through a secure admin process and configure the private `DATABASE_URL` for that role only; never connect the app as the `postgres` owner or expose database credentials in code/Git. Hosting is not configured yet, so local development continues to use the embedded database. Set `AUTH_SECRET` for hosting. Google sign-in can be enabled with `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

GitHub access to Supabase does not supply the app's runtime database credentials. The app continues to use NextAuth for sign-in; Supabase Auth is not configured. The Threadly tables have row level security enabled and do not grant direct browser access through Supabase's Data API. Apply the migration before pointing a hosted app at this database.
