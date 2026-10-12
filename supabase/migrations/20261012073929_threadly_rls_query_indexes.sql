-- Evaluate tenant context once per statement and cover optional connection FKs.
create index opportunities_workspace_connection_idx
  on public.opportunities (workspace_id, connection_id)
  where connection_id is not null;
create index source_monitors_workspace_connection_idx
  on public.source_monitors (workspace_id, connection_id)
  where connection_id is not null;

drop policy "Threadly workspace access" on public.workspaces;
drop policy "Threadly workspace access" on public.opportunities;
drop policy "Threadly workspace access" on public.drafts;
drop policy "Threadly workspace access" on public.leads;
drop policy "Threadly workspace access" on public.social_connections;
drop policy "Threadly workspace access" on public.source_monitors;
drop policy "Threadly workspace access" on public.source_sync_runs;

create policy "Threadly workspace access" on public.workspaces
  for all to threadly_app
  using (id = (select current_setting('threadly.workspace_id', true)))
  with check (id = (select current_setting('threadly.workspace_id', true)));
create policy "Threadly workspace access" on public.opportunities
  for all to threadly_app
  using (workspace_id = (select current_setting('threadly.workspace_id', true)))
  with check (workspace_id = (select current_setting('threadly.workspace_id', true)));
create policy "Threadly workspace access" on public.drafts
  for all to threadly_app
  using (workspace_id = (select current_setting('threadly.workspace_id', true)))
  with check (workspace_id = (select current_setting('threadly.workspace_id', true)));
create policy "Threadly workspace access" on public.leads
  for all to threadly_app
  using (workspace_id = (select current_setting('threadly.workspace_id', true)))
  with check (workspace_id = (select current_setting('threadly.workspace_id', true)));
create policy "Threadly workspace access" on public.social_connections
  for all to threadly_app
  using (workspace_id = (select current_setting('threadly.workspace_id', true)))
  with check (workspace_id = (select current_setting('threadly.workspace_id', true)));
create policy "Threadly workspace access" on public.source_monitors
  for all to threadly_app
  using (workspace_id = (select current_setting('threadly.workspace_id', true)))
  with check (workspace_id = (select current_setting('threadly.workspace_id', true)));
create policy "Threadly workspace access" on public.source_sync_runs
  for all to threadly_app
  using (workspace_id = (select current_setting('threadly.workspace_id', true)))
  with check (workspace_id = (select current_setting('threadly.workspace_id', true)));
