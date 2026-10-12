-- Only the authenticated Threadly server connects with this role.
-- Set its password outside migrations and store the connection string in Vercel.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'threadly_app') then
    create role threadly_app nologin;
  end if;
end $$;

grant connect on database postgres to threadly_app;
grant usage on schema public to threadly_app;
grant select, insert, update, delete on public.workspaces,
  public.opportunities, public.drafts, public.leads to threadly_app;

create policy "Threadly server access" on public.workspaces
  for all to threadly_app using (true) with check (true);
create policy "Threadly server access" on public.opportunities
  for all to threadly_app using (true) with check (true);
create policy "Threadly server access" on public.drafts
  for all to threadly_app using (true) with check (true);
create policy "Threadly server access" on public.leads
  for all to threadly_app using (true) with check (true);
