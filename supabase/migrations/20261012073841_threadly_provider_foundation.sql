-- Server-only provider storage foundation. Provider credentials must remain NULL
-- until application-layer encryption and key management are implemented.

-- Keep references to opportunities inside the owning workspace.
alter table public.opportunities
  add constraint opportunities_workspace_id_unique unique (workspace_id, id);

alter table public.drafts
  drop constraint drafts_opportunity_id_fkey,
  add constraint drafts_opportunity_workspace_fkey
    foreign key (workspace_id, opportunity_id)
    references public.opportunities (workspace_id, id);

alter table public.leads
  drop constraint leads_opportunity_id_fkey,
  add constraint leads_opportunity_workspace_fkey
    foreign key (workspace_id, opportunity_id)
    references public.opportunities (workspace_id, id);

create table public.social_connections (
  id text primary key,
  workspace_id text not null references public.workspaces(id),
  provider text not null check (provider in ('reddit', 'x', 'threads')),
  provider_account_id text,
  account_handle text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'active', 'expired', 'revoked', 'error')),
  scopes text[] not null default '{}',
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  token_key_version smallint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_connections_token_version_check
    check ((access_token_ciphertext is null and refresh_token_ciphertext is null)
      or token_key_version is not null),
  constraint social_connections_workspace_id_unique unique (workspace_id, id),
  constraint social_connections_provider_account_unique
    unique (workspace_id, provider, provider_account_id)
);

create table public.source_monitors (
  id text primary key,
  workspace_id text not null references public.workspaces(id),
  connection_id text,
  provider text not null check (provider in ('reddit', 'x', 'threads')),
  monitor_type text not null check (monitor_type in ('community', 'keyword', 'account')),
  query text not null,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'active'
    check (status in ('active', 'paused', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint source_monitors_connection_workspace_fkey
    foreign key (workspace_id, connection_id)
    references public.social_connections (workspace_id, id),
  constraint source_monitors_workspace_id_unique unique (workspace_id, id)
);

create table public.source_sync_runs (
  id text primary key,
  workspace_id text not null references public.workspaces(id),
  monitor_id text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  cursor text,
  fetched_count integer not null default 0 check (fetched_count >= 0),
  stored_count integer not null default 0 check (stored_count >= 0),
  error_code text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint source_sync_runs_monitor_workspace_fkey
    foreign key (workspace_id, monitor_id)
    references public.source_monitors (workspace_id, id),
  constraint source_sync_runs_workspace_id_unique unique (workspace_id, id)
);

alter table public.opportunities
  add column source_external_id text,
  add column connection_id text,
  add constraint opportunities_connection_workspace_fkey
    foreign key (workspace_id, connection_id)
    references public.social_connections (workspace_id, id);

create unique index opportunities_external_source_unique
  on public.opportunities (workspace_id, platform, source_external_id)
  where source_external_id is not null;
create index drafts_workspace_opportunity_idx on public.drafts (workspace_id, opportunity_id);
create index leads_workspace_opportunity_idx on public.leads (workspace_id, opportunity_id);
create index social_connections_workspace_status_idx
  on public.social_connections (workspace_id, status);
create index source_monitors_workspace_status_idx
  on public.source_monitors (workspace_id, status);
create index source_sync_runs_workspace_monitor_started_idx
  on public.source_sync_runs (workspace_id, monitor_id, started_at desc);

alter table public.social_connections enable row level security;
alter table public.source_monitors enable row level security;
alter table public.source_sync_runs enable row level security;

-- The authenticated server sets this transaction-locally from NextAuth's
-- session.user.email, the exact key used by workspaces.id and workspace_id.
drop policy "Threadly server access" on public.workspaces;
drop policy "Threadly server access" on public.opportunities;
drop policy "Threadly server access" on public.drafts;
drop policy "Threadly server access" on public.leads;

create policy "Threadly workspace access" on public.workspaces
  for all to threadly_app
  using (id = current_setting('threadly.workspace_id', true))
  with check (id = current_setting('threadly.workspace_id', true));
create policy "Threadly workspace access" on public.opportunities
  for all to threadly_app
  using (workspace_id = current_setting('threadly.workspace_id', true))
  with check (workspace_id = current_setting('threadly.workspace_id', true));
create policy "Threadly workspace access" on public.drafts
  for all to threadly_app
  using (workspace_id = current_setting('threadly.workspace_id', true))
  with check (workspace_id = current_setting('threadly.workspace_id', true));
create policy "Threadly workspace access" on public.leads
  for all to threadly_app
  using (workspace_id = current_setting('threadly.workspace_id', true))
  with check (workspace_id = current_setting('threadly.workspace_id', true));
create policy "Threadly workspace access" on public.social_connections
  for all to threadly_app
  using (workspace_id = current_setting('threadly.workspace_id', true))
  with check (workspace_id = current_setting('threadly.workspace_id', true));
create policy "Threadly workspace access" on public.source_monitors
  for all to threadly_app
  using (workspace_id = current_setting('threadly.workspace_id', true))
  with check (workspace_id = current_setting('threadly.workspace_id', true));
create policy "Threadly workspace access" on public.source_sync_runs
  for all to threadly_app
  using (workspace_id = current_setting('threadly.workspace_id', true))
  with check (workspace_id = current_setting('threadly.workspace_id', true));

grant select, insert, update, delete on public.social_connections,
  public.source_monitors, public.source_sync_runs to threadly_app;
revoke all on public.social_connections, public.source_monitors, public.source_sync_runs
  from anon, authenticated;
