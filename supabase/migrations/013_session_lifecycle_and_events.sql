-- Session lifecycle (waiting/active/ended) + event log channel used by host end-session + future gameplay.
ALTER TABLE sessions ADD COLUMN status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'ended'));
ALTER TABLE sessions ADD COLUMN ended_at timestamptz;

CREATE TABLE session_events (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id           uuid        NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    type                 text        NOT NULL,
    payload              jsonb       NOT NULL DEFAULT '{}'::jsonb,
    actor_participant_id uuid        REFERENCES participants (id) ON DELETE SET NULL,
    turn_number          int,
    created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_events_session_created_at ON session_events (session_id, created_at);

GRANT SELECT, INSERT ON session_events TO anon, authenticated;

ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_events_select ON session_events FOR SELECT USING (true);
CREATE POLICY session_events_insert ON session_events FOR INSERT WITH CHECK (
    actor_participant_id IS NULL OR EXISTS (
        SELECT 1 FROM participants
        WHERE id = actor_participant_id AND session_id = session_events.session_id
    )
);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_events;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- Host-initiated end: authorises the caller is the host, flips status, emits
-- session_ended, and clears prior history per ADR 001.
CREATE OR REPLACE FUNCTION end_session(
    p_session_id uuid,
    p_reason text,
    p_actor_participant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM participants
        WHERE id = p_actor_participant_id
          AND session_id = p_session_id
          AND is_host = true
    ) THEN
        RAISE EXCEPTION 'Only the host can end this session';
    END IF;

    UPDATE sessions SET status = 'ended', ended_at = now() WHERE id = p_session_id;

    DELETE FROM session_events WHERE session_id = p_session_id;
    INSERT INTO session_events (session_id, type, payload, actor_participant_id)
    VALUES (
        p_session_id,
        'session_ended',
        jsonb_build_object('reason', p_reason),
        p_actor_participant_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION end_session(uuid, text, uuid) TO anon, authenticated;
