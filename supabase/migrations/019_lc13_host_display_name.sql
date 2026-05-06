-- LC-13 host enters own display name. Previously the RPC hardcoded
-- display_name = 'Host', which blocked any joiner from picking "Host" as
-- their name (unique constraint on session_id+display_name) and gave no
-- personal identity in the UI. Add p_host_display_name and insert it.

DROP FUNCTION IF EXISTS create_hosted_session(text, text, text, text[]);

CREATE OR REPLACE FUNCTION create_hosted_session(
    p_title text,
    p_host_display_name text,
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
        new_session_id, p_host_display_name, p_host_native_language, p_host_proficiency_levels, true
    )
    RETURNING id INTO new_participant_id;

    RETURN QUERY SELECT new_session_id, new_participant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_hosted_session(text, text, text, text, text[]) TO anon, authenticated;
