-- Tighten anon/authenticated permissions and introduce starter RLS policies.
-- Revoke blanket UPDATE/DELETE first; anonymous clients never mutate existing rows.

REVOKE UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Enable Row Level Security on every public table that client code touches.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_cards_used ENABLE ROW LEVEL SECURITY;

-- sessions: readable + creatable; no mutations (revoked above and no policy grants it).
CREATE POLICY sessions_select ON sessions FOR SELECT USING (true);
CREATE POLICY sessions_insert ON sessions FOR INSERT WITH CHECK (true);

-- participants: readable + creatable only for a session that exists.
CREATE POLICY participants_select ON participants FOR SELECT USING (true);
CREATE POLICY participants_insert ON participants FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = participants.session_id)
);

-- cards + translations: static content, read-only for anon/authenticated.
CREATE POLICY cards_select ON cards FOR SELECT USING (true);
CREATE POLICY card_translations_select ON card_translations FOR SELECT USING (true);

-- session_cards_used: gameplay tickets will refine these; starter policy allows insert+select.
CREATE POLICY session_cards_used_select ON session_cards_used FOR SELECT USING (true);
CREATE POLICY session_cards_used_insert ON session_cards_used FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE sessions.id = session_cards_used.session_id)
);
