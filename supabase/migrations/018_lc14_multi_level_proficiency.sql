-- LC-14 multi-level proficiency. Participants can now hold multiple CEFR
-- levels at once so that JLPT N1 → {C1, C2} and players who straddle two
-- levels get a wider pool of cards. Schema choice: text[] column on
-- participants (not a join table) because we only ever read the full list
-- when drawing cards — no per-level fks, writes, or lookups.

ALTER TABLE participants ADD COLUMN proficiency_levels text[];
UPDATE participants SET proficiency_levels = ARRAY[proficiency_level];
ALTER TABLE participants
    ALTER COLUMN proficiency_levels SET NOT NULL,
    ADD CONSTRAINT participants_proficiency_levels_not_empty
        CHECK (array_length(proficiency_levels, 1) >= 1),
    ADD CONSTRAINT participants_proficiency_levels_valid
        CHECK (proficiency_levels <@ ARRAY['A1','A2','B1','B2','C1','C2']::text[]);
ALTER TABLE participants DROP COLUMN proficiency_level;

DROP FUNCTION IF EXISTS create_hosted_session(text, text, text, text);

CREATE OR REPLACE FUNCTION create_hosted_session(
    p_title text,
    p_target_language text,
    p_host_native_language text,
    p_host_proficiency_levels text[]
)
RETURNS TABLE (session_id uuid, participant_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
    new_session_id uuid;
    new_participant_id uuid;
BEGIN
    INSERT INTO sessions (title, target_language, host_native_language)
    VALUES (p_title, p_target_language, p_host_native_language)
    RETURNING id INTO new_session_id;

    INSERT INTO participants (
        session_id, display_name, native_language, proficiency_levels, is_host
    )
    VALUES (
        new_session_id, 'Host', p_host_native_language, p_host_proficiency_levels, true
    )
    RETURNING id INTO new_participant_id;

    RETURN QUERY SELECT new_session_id, new_participant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_hosted_session(text, text, text, text[]) TO anon, authenticated;

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

    RETURN v_new_card_id;
END;
$$;
