ALTER TABLE cards
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
