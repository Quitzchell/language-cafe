-- Local dev only: align Supabase service-role passwords with POSTGRES_PASSWORD.
-- The supabase/postgres image does not set passwords for authenticator,
-- supabase_auth_admin, or supabase_admin, so PostgREST / gotrue / postgres-meta
-- cannot connect with the compose-provided credentials. Production setups
-- should use proper secret management and should not run this migration.

ALTER USER authenticator WITH PASSWORD 'postgres';
ALTER USER supabase_auth_admin WITH PASSWORD 'postgres';
ALTER USER supabase_admin WITH PASSWORD 'postgres';