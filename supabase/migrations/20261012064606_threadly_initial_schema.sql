-- Threadly uses server-side PostgreSQL queries after checking its NextAuth session.
-- No browser role needs direct access to these tables through the Supabase Data API.
create table if not exists public.workspaces (
  id text primary key,
  name text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id text primary key,
  workspace_id text not null references public.workspaces(id),
  platform text not null,
  community text not null,
  author text not null,
  title text not null,
  body text not null,
  pain text not null,
  intent text not null,
  relevance integer not null,
  engagement text not null,
  source_url text,
  source_kind text not null default 'demo',
  observed_at timestamptz not null default now(),
  status text not null default 'new'
);

create unique index if not exists manual_opportunity_source
  on public.opportunities (workspace_id, source_url)
  where source_kind = 'manual';

create table if not exists public.drafts (
  id text primary key,
  workspace_id text not null references public.workspaces(id),
  opportunity_id text references public.opportunities(id),
  platform text not null,
  kind text not null,
  text text not null,
  status text not null default 'draft',
  origin text not null default 'sample',
  approved_at timestamptz,
  approved_by text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id text primary key,
  workspace_id text not null references public.workspaces(id),
  opportunity_id text references public.opportunities(id),
  name text not null,
  company text not null default '',
  role text not null default '',
  platform text not null,
  pain text not null default '',
  stage text not null default 'identified',
  notes text not null default '',
  owner text not null default '',
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.opportunities enable row level security;
alter table public.drafts enable row level security;
alter table public.leads enable row level security;

revoke all on public.workspaces, public.opportunities, public.drafts, public.leads
  from anon, authenticated;
