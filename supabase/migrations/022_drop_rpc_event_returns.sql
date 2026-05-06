-- Revert the RPC return-type change introduced in 020 (LC-33). The client
-- no longer reads the returned event row — LC-34 made the Realtime broadcast
-- reliable enough that optimistic apply on the writer is unnecessary. Drop
-- the surrounding plumbing so the functions only do what they need to:
-- insert the session_events row, return void.
-- Return type change requires DROP + CREATE; CREATE OR REPLACE cannot change it.

DROP FUNCTION IF EXISTS draw_card(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS skip_card(uuid, uuid);
DROP FUNCTION IF EXISTS pass_turn(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION draw_card(
    p_session_id            uuid,
    p_actor_participant_id  uuid,
    p_target_participant_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_host_native   text;
    v_target_lang   text;
    v_target_native text;
    v_target_levels text[];
    v_practice_lang text;
    v_card_id       uuid;
    v_turn_number   int;
    v_status        text;
BEGIN
    IF current_dealer(p_session_id) IS DISTINCT FROM p_actor_participant_id THEN
        RAISE EXCEPTION 'Only the current dealer can draw cards';
    END IF;

    SELECT status, host_native_language, target_language
      INTO v_status, v_host_native, v_target_lang
    FROM sessions WHERE id = p_session_id;

    IF v_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Session is not active';
    END IF;

    SELECT native_language, proficiency_levels
      INTO v_target_native, v_target_levels
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
    WHERE c.proficiency_level = ANY(v_target_levels)
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
        RAISE EXCEPTION 'No cards left at levels %', v_target_levels
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
END;
$$;

CREATE OR REPLACE FUNCTION skip_card(
    p_session_id           uuid,
    p_actor_participant_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_status              text;
    v_host_native         text;
    v_target_lang         text;
    v_target_native       text;
    v_target_levels       text[];
    v_practice_lang       text;
    v_current_event_id    uuid;
    v_current_card_id     uuid;
    v_target_id           uuid;
    v_turn_number         int;
    v_current_created_at  timestamptz;
    v_new_card_id         uuid;
BEGIN
    IF current_dealer(p_session_id) IS DISTINCT FROM p_actor_participant_id THEN
        RAISE EXCEPTION 'Only the current dealer can skip cards';
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

    SELECT native_language, proficiency_levels
      INTO v_target_native, v_target_levels
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
    WHERE c.proficiency_level = ANY(v_target_levels)
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
        RAISE EXCEPTION 'No cards left at levels %', v_target_levels
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
END;
$$;

CREATE OR REPLACE FUNCTION pass_turn(
    p_session_id           uuid,
    p_actor_participant_id uuid,
    p_next_participant_id  uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_status              text;
    v_current_card_id     uuid;
    v_current_target_id   uuid;
    v_current_turn        int;
    v_current_created_at  timestamptz;
BEGIN
    IF current_dealer(p_session_id) IS DISTINCT FROM p_actor_participant_id THEN
        RAISE EXCEPTION 'Only the current dealer can pass the turn';
    END IF;

    IF p_next_participant_id = p_actor_participant_id THEN
        RAISE EXCEPTION 'Dealer cannot pass to themselves';
    END IF;

    SELECT status INTO v_status FROM sessions WHERE id = p_session_id FOR UPDATE;

    IF v_status IS DISTINCT FROM 'active' THEN
        RAISE EXCEPTION 'Session is not active';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM participants
        WHERE id = p_next_participant_id AND session_id = p_session_id
    ) THEN
        RAISE EXCEPTION 'Next dealer not in session';
    END IF;

    SELECT (payload ->> 'card_id')::uuid,
           (payload ->> 'target_participant_id')::uuid,
           turn_number,
           created_at
      INTO v_current_card_id, v_current_target_id,
           v_current_turn, v_current_created_at
    FROM session_events
    WHERE session_id = p_session_id
      AND type = 'card_drawn'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_current_card_id IS NULL THEN
        RAISE EXCEPTION 'No card to pass on';
    END IF;

    IF EXISTS (
        SELECT 1 FROM session_events
        WHERE session_id = p_session_id
          AND type IN ('card_skipped', 'turn_passed')
          AND created_at > v_current_created_at
    ) THEN
        RAISE EXCEPTION 'No card to pass on';
    END IF;

    IF v_current_target_id IS DISTINCT FROM p_next_participant_id THEN
        RAISE EXCEPTION 'Turn can only pass to the current card receiver';
    END IF;

    INSERT INTO session_events (
        session_id, type, payload, actor_participant_id, turn_number
    ) VALUES (
        p_session_id,
        'turn_passed',
        jsonb_build_object('next_participant_id', p_next_participant_id),
        p_actor_participant_id,
        v_current_turn
    );
END;
$$;

GRANT EXECUTE ON FUNCTION draw_card(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION skip_card(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pass_turn(uuid, uuid, uuid) TO anon, authenticated;

-- Signature changes invalidate PostgREST's schema cache; tell it to reload.
NOTIFY pgrst, 'reload schema';
