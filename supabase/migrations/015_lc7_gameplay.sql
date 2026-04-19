-- LC-7 gameplay: start session + draw card RPCs. Card dedup derives from
-- session_events (type = 'card_drawn') per ADR 001; the old session_cards_used
-- table becomes redundant and is removed here.

DROP POLICY IF EXISTS session_cards_used_select ON session_cards_used;
DROP POLICY IF EXISTS session_cards_used_insert ON session_cards_used;
DROP TABLE IF EXISTS session_cards_used;

CREATE OR REPLACE FUNCTION start_session(
    p_session_id           uuid,
    p_actor_participant_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_status text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM participants
        WHERE id = p_actor_participant_id
          AND session_id = p_session_id
          AND is_host = true
    ) THEN
        RAISE EXCEPTION 'Only the host can start this session';
    END IF;

    SELECT status INTO v_status FROM sessions WHERE id = p_session_id FOR UPDATE;
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;
    IF v_status = 'ended' THEN
        RAISE EXCEPTION 'Session already ended';
    END IF;
    IF v_status = 'active' THEN
        RETURN;
    END IF;

    UPDATE sessions SET status = 'active' WHERE id = p_session_id;
    INSERT INTO session_events (session_id, type, payload, actor_participant_id)
    VALUES (p_session_id, 'session_started', '{}'::jsonb, p_actor_participant_id);
END;
$$;

GRANT EXECUTE ON FUNCTION start_session(uuid, uuid) TO anon, authenticated;

-- Dealer picks a target; draws a random card at the target's CEFR level that
-- has not been drawn in this session. Practice language is resolved
-- server-side: mirrors the client logic in ParticipantJoin (practice = target
-- language when target.native = host.native, else host.native).
CREATE OR REPLACE FUNCTION draw_card(
    p_session_id            uuid,
    p_actor_participant_id  uuid,
    p_target_participant_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_host_native   text;
    v_target_lang   text;
    v_target_native text;
    v_target_level  text;
    v_practice_lang text;
    v_card_id       uuid;
    v_turn_number   int;
    v_status        text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM participants
        WHERE id = p_actor_participant_id
          AND session_id = p_session_id
          AND is_host = true
    ) THEN
        RAISE EXCEPTION 'Only the host can draw cards';
    END IF;

    SELECT status, host_native_language, target_language
      INTO v_status, v_host_native, v_target_lang
    FROM sessions WHERE id = p_session_id;

    IF v_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Session is not active';
    END IF;

    SELECT native_language, proficiency_level
      INTO v_target_native, v_target_level
    FROM participants
    WHERE id = p_target_participant_id AND session_id = p_session_id;

    IF v_target_native IS NULL THEN
        RAISE EXCEPTION 'Target participant not in session';
    END IF;

    v_practice_lang := CASE
        WHEN v_target_native = v_host_native THEN v_target_lang
        ELSE v_host_native
    END;

    SELECT c.id INTO v_card_id
    FROM cards c
    WHERE c.proficiency_level = v_target_level
      AND c.id NOT IN (
          SELECT (payload ->> 'card_id')::uuid
          FROM session_events
          WHERE session_id = p_session_id
            AND type = 'card_drawn'
            AND payload ? 'card_id'
      )
    ORDER BY random()
    LIMIT 1;

    IF v_card_id IS NULL THEN
        RAISE EXCEPTION 'No cards left at level %', v_target_level
            USING ERRCODE = 'P0002';
    END IF;

    SELECT COALESCE(MAX(turn_number), 0) + 1 INTO v_turn_number
    FROM session_events
    WHERE session_id = p_session_id AND type = 'card_drawn';

    INSERT INTO session_events (
        session_id, type, payload, actor_participant_id, turn_number
    ) VALUES (
        p_session_id,
        'card_drawn',
        jsonb_build_object(
            'card_id', v_card_id,
            'target_participant_id', p_target_participant_id,
            'practice_language', v_practice_lang,
            'native_language', v_target_native
        ),
        p_actor_participant_id,
        v_turn_number
    );

    RETURN v_card_id;
END;
$$;

GRANT EXECUTE ON FUNCTION draw_card(uuid, uuid, uuid) TO anon, authenticated;
