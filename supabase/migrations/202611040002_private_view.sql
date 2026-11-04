-- The server's service role reads the published view with its own permissions.
grant select on public.published_resources to service_role;
