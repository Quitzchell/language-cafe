-- LC-34 migrate realtime delivery from postgres_changes to broadcast.
-- postgres_changes is deprecated by Supabase (single-threaded, flagged for
-- migration away); on this self-hosted stack it silently drops events to
-- listeners too, not only the writer that LC-33 papered over. Triggers
-- publish each INSERT via realtime.send to a per-session topic; the client
-- subscribes via .on('broadcast'). Public channels (private := false)
-- because the existing trust model is "anyone who knows the session id can
-- read its events" (SELECT USING (true) on both tables) — private channels
-- would need RLS on realtime.messages and anon setAuth() plumbing for no
-- security gain today.

CREATE OR REPLACE FUNCTION broadcast_session_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM realtime.send(
        to_jsonb(NEW),
        'insert',
        'session:' || NEW.session_id::text || ':events',
        false
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER session_events_broadcast
    AFTER INSERT ON session_events
    FOR EACH ROW EXECUTE FUNCTION broadcast_session_event();

CREATE OR REPLACE FUNCTION broadcast_participant_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM realtime.send(
        to_jsonb(NEW),
        'insert',
        'session:' || NEW.session_id::text || ':participants',
        false
    );
    RETURN NULL;
END;
$$;

CREATE TRIGGER participants_broadcast
    AFTER INSERT ON participants
    FOR EACH ROW EXECUTE FUNCTION broadcast_participant_insert();
