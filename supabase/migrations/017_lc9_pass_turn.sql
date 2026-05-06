-- LC-9 pass turn: dealer hands the turn to the current card's receiver, who
-- becomes the new dealer. The "host" role stays with the session creator
-- permanently; only the dealer rotates. Per ADR 001, the current dealer is
-- derived from the event log (latest turn_passed.next_participant_id, else
-- the session host) — no new column on sessions. draw_card and skip_card are
-- retrofitted to authorise the current dealer instead of hard-checking
-- is_host = true.

CREATE OR REPLACE FUNCTION current_dealer(p_session_id uuid)
RETURNS uuid
LANGUAGE sql STABLE
AS $$
    SELECT COALESCE(
        (SELECT (payload ->> 'next_participant_id')::uuid
           FROM session_events
          WHERE session_id = p_session_id AND type = 'turn_passed'
          ORDER BY created_at DESC
          LIMIT 1),
        (SELECT id FROM participants
          WHERE session_id = p_session_id AND is_host = true
          LIMIT 1)
    );
$$;

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
    IF current_dealer(p_session_id) IS DISTINCT FROM p_actor_participant_id THEN
        RAISE EXCEPTION 'Only the current dealer can draw cards';
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

-- Dealer passes the turn to the current card's receiver. Guards:
-- * session must be active,
-- * actor must be the current dealer,
-- * there must be a live card (card_drawn not already superseded by a newer
--   card_skipped or turn_passed on the same card),
-- * p_next_participant_id must match the live card's target and belong to
--   the session (extra belt + braces),
-- * next dealer cannot be the actor themselves.
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

GRANT EXECUTE ON FUNCTION current_dealer(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pass_turn(uuid, uuid, uuid) TO anon, authenticated;
