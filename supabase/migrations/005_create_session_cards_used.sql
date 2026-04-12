CREATE TABLE session_cards_used (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    card_id uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
    participant_id uuid NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
    used_at timestamptz NOT NULL DEFAULT now()
);
