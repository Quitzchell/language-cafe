-- Stream participants changes over Supabase Realtime.
-- The supabase/postgres image normally pre-creates an empty supabase_realtime
-- publication; these DO blocks make the migration idempotent either way.

-- The Realtime container runs Ecto migrations against these schemas on boot:
--   _realtime — server-level state (schema_migrations, tenants, ...)
--   realtime  — per-tenant CDC objects (extensions, subscriptions, ...)
-- Both must exist before the container connects.
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS realtime;
GRANT ALL ON SCHEMA _realtime, realtime TO supabase_admin;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END
$$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE participants;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;
