---
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
execution: code
---

# Supabase Foundation for Threadly

## Goal Capsule

Objective: Threadly can keep each user's workspace data private and has a migration-managed data model ready to store future Reddit, X, and Threads listening results and connection metadata.

Means: Keep NextAuth and the current server-side PostgreSQL data layer, and enforce tenant scope in PostgreSQL RLS using a transaction-local workspace identity (KTD1).

Authority: User asked to complete Supabase before social integrations. Do not implement social API calls, publishing, billing, or deployment in this work.

Execution profile: security-sensitive schema and server database changes; preserve the current public demo and local PGlite workflow.

## Product Contract

### Summary

Finish the Supabase database and repository foundation before connecting external social platforms. The current Supabase project is `threadly` (`jiikixgbkzbysdbfspbt`, `ap-south-1`). The app currently uses NextAuth email identity, a `pg` connection when `DATABASE_URL` exists, and local PGlite otherwise.

### Problem Frame

RLS is enabled on the four existing tables, but the `threadly_app` policy currently allows every row. Application queries filter by workspace email; the database does not independently enforce that boundary. The schema also has no durable representation for source connections, monitored targets, or sync runs. Until migrations, grants, tenant scope, and tests agree, connecting real provider credentials or collecting data would be premature.

### Requirements

- **R1** Preserve NextAuth as the source of authenticated workspace identity; never trust a workspace ID supplied by the browser.
- **R2** Enforce workspace isolation in PostgreSQL for the app role on every workspace-owned table, including existing workspaces, opportunities, drafts, and leads.
- **R3** Add migration-managed, workspace-owned records for provider connections, listening targets, and sync runs for Reddit, X, and Threads.
- **R4** Make credential fields ciphertext-only at rest; never store OAuth access/refresh tokens as plaintext, return credentials through APIs, or commit secrets.
- **R5** Keep the current demo/PGlite path working and do not make external API calls or deploy the site.
- **R6** Keep schema changes reproducible in Git migrations and reconcile the checkout with the existing GitHub repository without rewriting or force-pushing shared history.
- **R7** Verify migration state, database policies/grants, tenant isolation, indexes, application tests, and build/type checks before handoff.

### Scope Boundaries

In scope: Supabase schema, least-privilege app role, workspace-scoped RLS, server query scoping, provider-ready persistence model, migration parity, tests, Git branch/PR readiness.

Deferred: provider OAuth and data collection, Apify, publishing, Supabase Auth migration, token encryption/decryption implementation and secret provisioning, Vercel environment variables/deployment, payments, domain, production privacy/compliance review. Until encryption/key custody is implemented and reviewed, credential columns remain unused and application code must reject provider credential writes.

## Planning Contract

### Key Technical Decisions

- **KTD1 — Transaction-local tenant scope.** Keep NextAuth identity and `pg`. The database adapter runs each normal hosted API request in one transaction and sets a transaction-local workspace ID derived only from the authenticated server call. Standalone hosted queries outside a request context get their own scoped transaction. RLS compares `workspace_id` (or workspace `id`) to that setting. Missing scope must deny access, and transaction-local state avoids leaking one user's scope across pooled connections. This protects against omitted workspace filters and ordinary application mistakes; because a PostgreSQL custom setting can be changed by the connected role, it is not a security boundary against arbitrary SQL execution or compromise of the server database credential. Keep the database credential private to the server and retain parameterized queries and explicit workspace filters. Local PGlite continues without RLS context.
- **KTD2 — Private provider records.** Store connection metadata and encrypted-token columns in a non-browser-accessible table. No Supabase Data API grants go to `anon` or `authenticated`; the server app role receives only required table privileges and RLS policies. Ciphertext columns and key-version metadata are a future storage contract only: do not write or accept provider credentials until encryption/decryption, key custody, rotation/version handling, and secret provisioning are implemented and reviewed in the later provider integration work.
- **KTD3 — Minimal read/listen schema.** Add `social_connections`, `source_monitors`, and `source_sync_runs`, and add provider/external identity and optional connection linkage to opportunities. Limit providers to Reddit, X, Threads for these records; do not add publish queues or speculative billing tables.
- **KTD4 — Git safety.** Fetch current `origin/main` before branching because the local checkout contains a commit not in its stale tracking ref and an untracked migration that appears to correspond to a remote browser commit. Never reset, force-push, or silently discard either history; reconcile by ancestry and retain both intended commits and migration contents before pushing a feature branch/PR.

### Assumptions

- The canonical RLS workspace value is exactly `session.user.email` as currently passed to `ensureWorkspace`; `workspaces.id` and each child `workspace_id` are already written using that same value. Do not lowercase/normalize differently in only one layer. Any later identity/workspace migration must update this contract explicitly.
- Supabase remains server-only for this phase. The website is not yet configured with a Supabase password/connection string, and deployment remains deferred. Treat the named project as development/test infrastructure for this work; confirm current table counts remain zero before DDL and use rollback-only fixtures (no persistent test data and no destructive cleanup).
- Database users/rows are currently zero, so additive constraints/indexes can be applied without a data backfill; re-check before migration.

## Implementation Units

### U1. Reconcile repository and add provider-ready migrations

**Goal:** Establish a safe feature branch based on current GitHub history and make the Supabase schema reproducible and ready for read-only provider integrations.

**Requirements:** R3, R4, R6.

**Files:** `supabase/migrations/`, `lib/db.ts`, `tests/`.

**Approach:** Fetch remote refs and inspect ancestry before changing branches. Preserve local-only changes and compare the untracked role migration against remote history. Confirm table counts are still zero. Add a new forward-only migration after the committed schema: provider connection metadata with ciphertext-only token columns; provider monitors and sync-run records; opportunity source identity/linkage; workspace-scoped composite foreign keys where a child references another workspace-owned record; useful workspace, foreign-key, and provider lookup indexes; constraints for provider/status values. Do not add or expose actual credentials, and keep token fields unused until their encryption/key-management implementation is reviewed.

**Test scenarios:** Migration applies to a clean database; uniqueness rejects duplicate workspace/provider/external post identities; nullable source identity preserves manual/demo records; all provider metadata has an owning workspace; invalid providers/status values are rejected.

**Verification:** Supabase migration listing matches checked-in migrations; table definitions and constraints match migration; add indexes needed to cover all foreign keys; use the Supabase-documented `(select current_setting(...))` form so RLS context is evaluated once per statement; security advisor reports no new exposed-table/RLS issues. New indexes may appear unused until provider queries exist, which is expected before integration.

### U2. Enforce tenant isolation and test the hosted data path

**Goal:** Ensure database-level policies deny cross-workspace access even when a query omits its workspace filter.

**Requirements:** R1, R2, R5, R7.

**Files:** `lib/db.ts`, `lib/data.ts`, `supabase/migrations/`, `tests/`.

**Approach:** Replace permissive `USING (true)`/`WITH CHECK (true)` app-role policies with fail-closed policies keyed to `current_setting('threadly.workspace_id', true)`. The server adapter sets that value to the exact `session.user.email` workspace key used by `ensureWorkspace` and child rows. Scope a normal API request in one checked-out-client transaction so its database work is atomic and `SET LOCAL`/`set_config(..., true)` cannot leak across pooled connections. Run slow external work such as AI generation outside the transaction, then scope its subsequent database operations independently. Apply equivalent ownership policies to all new workspace tables. Preserve explicit workspace filters as defense in depth. Verify `threadly_app` has neither `BYPASSRLS` nor ownership of protected tables. Keep PGlite behavior unchanged.

**Test scenarios:** Scoped role can read/write its own workspace; the same role sees zero rows and cannot insert/update/delete another workspace's rows when the app supplies the other workspace only as row data; absent/empty workspace scope sees no rows and rejects writes; workspace child records cannot point across tenants; concurrent queries for two workspaces on the pool do not cross-contaminate; local PGlite tests retain existing behavior. Document that a caller able to issue arbitrary SQL as `threadly_app` can change the custom setting; do not claim RLS prevents that compromised-role threat.

**Verification:** Run `npm test`, `npm run typecheck`, and `npm run build`; after verifying zero existing rows, perform transactional RLS checks against the development Supabase project using rollback-only fixtures and the `threadly_app` role; inspect role attributes, ownership, grants, and policies; run Supabase security/performance advisors; ensure no credential values enter logs, source, Git, or API responses.

## Verification Contract

- `npm test`
- `npm run typecheck`
- `npm run build`
- Supabase MCP migration/table/policy/grant inspection and rollback-only tenant-isolation checks.
- Supabase security and performance advisors; unused-index notices on this empty, pre-integration database are expected, while unindexed foreign keys and per-row RLS setting evaluation must be resolved.
- Git review confirms no secrets, unrelated files, or history rewrite; publish changes on a feature branch and open a PR, leaving `main` unmerged.

## Definition of Done

- All existing and new workspace tables have RLS enabled, and the server role's policies fail closed when tenant scope is absent or mismatched.
- Hosted app queries establish tenant scope from authenticated server identity; existing PGlite and data tests pass.
- Provider connection metadata, listening targets, sync runs, and opportunity source identity can be stored without plaintext credentials.
- Supabase has the checked-in migration history and no unexpected user data was changed.
- App checks pass; Git changes are reviewable on a branch/PR with no force-push or deployment.
- No abandoned experiments or secrets remain in the diff.
