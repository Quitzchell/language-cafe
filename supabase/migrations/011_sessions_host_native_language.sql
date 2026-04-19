ALTER TABLE sessions ADD COLUMN host_native_language text;

UPDATE sessions s
SET host_native_language = p.native_language
FROM participants p
WHERE p.session_id = s.id
  AND p.is_host = true
  AND s.host_native_language IS NULL;

ALTER TABLE sessions ALTER COLUMN host_native_language SET NOT NULL;

CREATE OR REPLACE FUNCTION create_hosted_session(
    p_title text,
    p_target_language text,
    p_host_native_language text,
    p_host_proficiency_level text
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
        session_id, display_name, native_language, proficiency_level, is_host
    )
    VALUES (
        new_session_id, 'Host', p_host_native_language, p_host_proficiency_level, true
    )
    RETURNING id INTO new_participant_id;

    RETURN QUERY SELECT new_session_id, new_participant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_hosted_session(text, text, text, text) TO anon, authenticated;
