CREATE UNIQUE INDEX one_host_per_session
    ON participants (session_id)
    WHERE is_host = true;
