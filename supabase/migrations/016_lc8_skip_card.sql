-- LC-8 skip card: dealer skips the current card and draws a replacement at
-- the same CEFR level for the same target. Skipped card stays in the draw
-- history so dedup excludes it. Per ADR 001, card_skipped shares the
-- turn_number of the draw it replaces; the replacement card_drawn also
-- reuses that turn_number since a skip is a do-over, not a turn-pass.

CREATE OR REPLACE FUNCTION skip_card(
    p_session_id           uuid,
    p_actor_participant_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_status              text;
    v_host_native         text;
    v_target_lang         text;
    v_target_native       text;
    v_target_level        text;
    v_practice_lang       text;
    v_current_event_id    uuid;
    v_current_card_id     uuid;
    v_target_id           uuid;
    v_turn_number         int;
    v_current_created_at  timestamptz;
    v_new_card_id         uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM participants
        WHERE id = p_actor_participant_id
          AND session_id = p_session_id
          AND is_host = true
    ) THEN
        RAISE EXCEPTION 'Only the host can skip cards';
    END IF;

    SELECT status, host_native_language, target_language
      INTO v_status, v_host_native, v_target_lang
    FROM sessions WHERE id = p_session_id;

    IF v_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Session is not active';
    END IF;

    SELECT id,
           (payload ->> 'card_id')::uuid,
           (payload ->> 'target_participant_id')::uuid,
           turn_number,
           created_at
      INTO v_current_event_id, v_current_card_id, v_target_id,
           v_turn_number, v_current_created_at
    FROM session_events
    WHERE session_id = p_session_id
      AND type = 'card_drawn'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_current_event_id IS NULL THEN
        RAISE EXCEPTION 'No card to skip';
    END IF;

    IF EXISTS (
        SELECT 1 FROM session_events
        WHERE session_id = p_session_id
          AND type = 'card_skipped'
          AND (payload ->> 'card_id')::uuid = v_current_card_id
          AND created_at > v_current_created_at
    ) THEN
        RAISE EXCEPTION 'No card to skip';
    END IF;

    INSERT INTO session_events (
        session_id, type, payload, actor_participant_id, turn_number
    ) VALUES (
        p_session_id,
        'card_skipped',
        jsonb_build_object('card_id', v_current_card_id),
        p_actor_participant_id,
        v_turn_number
    );

    SELECT native_language, proficiency_level
      INTO v_target_native, v_target_level
    FROM participants
    WHERE id = v_target_id AND session_id = p_session_id;

    IF v_target_native IS NULL THEN
        RAISE EXCEPTION 'Target participant not in session';
    END IF;

    v_practice_lang := CASE
        WHEN v_target_native = v_host_native THEN v_target_lang
        ELSE v_host_native
    END;

    SELECT c.id INTO v_new_card_id
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

    IF v_new_card_id IS NULL THEN
        RAISE EXCEPTION 'No cards left at level %', v_target_level
            USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO session_events (
        session_id, type, payload, actor_participant_id, turn_number
    ) VALUES (
        p_session_id,
        'card_drawn',
        jsonb_build_object(
            'card_id', v_new_card_id,
            'target_participant_id', v_target_id,
            'practice_language', v_practice_lang,
            'native_language', v_target_native
        ),
        p_actor_participant_id,
        v_turn_number
    );

    RETURN v_new_card_id;
END;
$$;

GRANT EXECUTE ON FUNCTION skip_card(uuid, uuid) TO anon, authenticated;
