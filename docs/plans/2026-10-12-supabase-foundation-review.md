# Supabase Foundation Plan Review

Reviewed document: `docs/plans/2026-10-12-supabase-foundation.md`
Document type: unified-plan
Review coverage: coherence, feasibility, security, scope, adversarial.

## Dispositions

- Coherence: no findings.
- Feasibility: normal API request database work now shares one scoped transaction for atomicity; slow AI work remains outside that transaction, with subsequent database calls scoped independently.
- Security — transaction-local workspace identity can be changed by arbitrary SQL running as `threadly_app`: clarified the trust boundary; RLS is defense against missing workspace filters and ordinary app mistakes, not a compromised server-role defense.
- Security — token columns had no immediate encryption/key custody: clarified that credential writes are prohibited until encryption, rotation/version handling, and key provisioning are implemented and reviewed.
- Scope — project role of development/test database: resolved by the user's explicit request to complete this Supabase project, observed zero rows, and no deployment; verification uses only rollback-only fixtures.
- Adversarial — tenant ID mapping: verified `session.user.email` is passed unchanged to `ensureWorkspace` and stored as `workspaces.id`/child `workspace_id`; plan names the exact mapping.
- Adversarial — RLS bypass/ownership: verified `threadly_app` is NOLOGIN, has no BYPASSRLS, and does not own protected tables; migration runner is postgres/table owner.
- Adversarial — query transaction boundary: verified normal API database work uses request-scoped transaction context; the slow external AI call is not made while holding a database connection.

## Verification evidence

- Supabase migration history: `20261012064606`, `20261012071134`, `20261012073841`, `20261012073929`.
- Supabase security advisor: no lints.
- Supabase performance advisor: no unindexed foreign keys or per-row RLS context evaluation. Seven unused-index notices remain because the empty project has no provider workload yet; these indexes cover expected workspace/provider lookups and foreign keys.
- Rollback-only role test passed across all seven workspace tables; verified scoped reads, blocked cross-workspace writes, blocked cross-tenant foreign-key reference, and denied access with missing workspace scope. Temporary role grant and all fixture rows were rolled back.
- Post-test counts for existing and provider tables: zero.
