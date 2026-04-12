CREATE TABLE card_translations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id uuid NOT NULL REFERENCES cards (id) ON DELETE CASCADE,
    language text NOT NULL,
    translation text NOT NULL,
    UNIQUE (card_id, language)
);
