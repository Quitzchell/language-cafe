CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    target_language text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
