-- Auto-end sessions that have seen no activity for a while.
-- Activity = most recent session_events row; for sessions still in 'waiting'
-- with no events yet, falls back to sessions.created_at.

CREATE OR REPLACE FUNCTION auto_end_inactive_sessions(p_timeout_minutes int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ended_count int := 0;
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT s.id
        FROM sessions s
        LEFT JOIN LATERAL (
            SELECT MAX(created_at) AS last_event_at
            FROM session_events
            WHERE session_id = s.id
        ) e ON true
        WHERE s.status IN ('waiting', 'active')
          AND COALESCE(e.last_event_at, s.created_at)
              < now() - make_interval(mins => p_timeout_minutes)
    LOOP
        UPDATE sessions SET status = 'ended', ended_at = now() WHERE id = rec.id;
        DELETE FROM session_events WHERE session_id = rec.id;
        INSERT INTO session_events (session_id, type, payload)
        VALUES (rec.id, 'session_ended', jsonb_build_object('reason', 'inactivity'));
        ended_count := ended_count + 1;
    END LOOP;
    RETURN ended_count;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_end_inactive_sessions(int) TO authenticated;

-- Best-effort scheduling via pg_cron. The Supabase postgres image ships
-- with pg_cron preloaded; if it isn't available in another environment,
-- the NOTICE prints a hint to call the function from an external scheduler.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension unavailable: %. Call auto_end_inactive_sessions() from an external scheduler.', SQLERRM;
END $$;

DO $$
BEGIN
    PERFORM cron.schedule(
        'auto-end-inactive-sessions',
        '* * * * *',
        'SELECT auto_end_inactive_sessions(30);'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule auto_end_inactive_sessions via pg_cron: %', SQLERRM;
END $$;
