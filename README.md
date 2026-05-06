# Language Cafe

A turn-based language practice game. A host creates a session, picks a target language, and participants join from their own devices. The dealer (initially the host, then rotating) draws conversation prompts for one participant at a time; each card is shown in the practice language with a translation in the receiver's native language. Translations cover Dutch and Japanese today; Japanese cards include romanization for non-Latin scripts.

The stack is React + Vite on the front end, Supabase (Postgres + Realtime + PostgREST + Kong) on the back, all wired up via Docker Compose for local development.

## Prerequisites

- [Docker](https://www.docker.com/) (with Docker Compose)
- [Make](https://www.gnu.org/software/make/)

## Getting Started

1. Copy the environment file:

   ```sh
   cp .env.example .env
   ```

2. Start all services:

   ```sh
   make dev
   ```

   The first run will pull Docker images, which may take a few minutes.

3. Open the app at [http://localhost:5173](http://localhost:5173)

## Available Services

| Service          | URL                          |
| ---------------- | ---------------------------- |
| App (Vite)       | http://localhost:5173        |
| Supabase API     | http://localhost:8000        |
| Supabase Studio  | http://localhost:3001        |
| PostgREST        | http://localhost:3000        |
| PostgreSQL       | localhost:5432               |

## Make Commands

| Command          | Description                                  |
| ---------------- | -------------------------------------------- |
| `make dev`       | Start all services with logs attached         |
| `make up`        | Start all services in the background          |
| `make down`      | Stop all services                             |
| `make build`     | Rebuild containers                            |
| `make install`   | Run `npm install` inside the app container    |
| `make lint`      | Run the linter                                |
| `make logs`      | Tail logs for all services                    |
| `make logs-app`  | Tail logs for the app only                    |
| `make logs-db`   | Tail logs for the database only               |
| `make reset-db`  | Reset the Supabase database (destroys data)   |
| `make shell`     | Open a shell in the app container             |
| `make clean`     | Remove all containers, volumes, and images    |

## Database

The database schema is managed through SQL migration files and seeded with test data automatically.

### How it works

- Migration files live in `supabase/migrations/` and are numbered (e.g. `001_create_sessions.sql`)
- Test/development data lives in `supabase/seed.sql`
- On first startup (fresh volume), the Supabase Postgres image runs migrations in order, then the seed file
- Init scripts only run when the data volume is empty

### Resetting the database

To wipe all data and re-run migrations + seed from scratch:

```sh
make reset-db
```

This removes the database volume and recreates the container, giving you a clean database with fresh seed data.

### Adding a new migration

1. Create a new numbered SQL file in `supabase/migrations/`, continuing from the highest existing number:

   ```
   supabase/migrations/024_create_new_table.sql
   ```

2. Reset the database to apply it:

   ```sh
   make reset-db
   ```

### Schema

#### `sessions`

A language practice session created by a host.

| Column                 | Type        | Description                                                |
| ---------------------- | ----------- | ---------------------------------------------------------- |
| `id`                   | uuid (PK)   | Auto-generated                                             |
| `title`                | text        | Name chosen by the host                                    |
| `target_language`      | text        | Language being practiced                                   |
| `host_native_language` | text        | Host's mother tongue (used to resolve practice language)   |
| `status`               | text        | Lifecycle: `waiting`, `active`, or `ended`                 |
| `ended_at`             | timestamptz | Set when the session ends; null otherwise                  |
| `created_at`           | timestamptz | Defaults to now()                                          |

#### `participants`

People who join a session. The first participant is the host.

| Column               | Type        | Description                                                  |
| -------------------- | ----------- | ------------------------------------------------------------ |
| `id`                 | uuid (PK)   | Auto-generated                                               |
| `session_id`         | uuid (FK)   | References `sessions`                                        |
| `display_name`       | text        | Chosen by the participant                                    |
| `native_language`    | text        | Participant's mother tongue                                  |
| `proficiency_levels` | text[]      | CEFR levels (subset of A1, A2, B1, B2, C1, C2); at least one |
| `is_host`            | boolean     | Whether this participant is the host                         |
| `joined_at`          | timestamptz | Defaults to now()                                            |

Unique constraint on `(session_id, display_name)`. Multiple levels let learners who straddle two CEFR bands (e.g. JLPT N1 → C1 + C2) draw from a wider card pool.

#### `cards`

Conversation prompt questions, always stored in English.

| Column             | Type        | Description                         |
| ------------------ | ----------- | ----------------------------------- |
| `id`               | uuid (PK)   | Auto-generated                      |
| `question`         | text        | The question in English             |
| `proficiency_level`| text        | CEFR level: A1, A2, B1, B2, C1, C2 |
| `created_at`       | timestamptz | Defaults to now()                   |

#### `card_translations`

Translations of card questions into supported languages (Dutch, Japanese).

| Column         | Type      | Description                                                       |
| -------------- | --------- | ----------------------------------------------------------------- |
| `id`           | uuid (PK) | Auto-generated                                                    |
| `card_id`      | uuid (FK) | References `cards`                                                |
| `language`     | text      | Target language                                                   |
| `translation`  | text      | The question in that language                                     |
| `romanization` | text      | Optional Latin transliteration for non-Latin scripts (e.g. romaji) |

Unique constraint on `(card_id, language)`.

#### `session_events`

Append-only event log per session. The event log is the source of truth for which cards have been drawn, who the current dealer is, and when the session ended; there is no separate "cards used" table.

| Column                 | Type        | Description                                                       |
| ---------------------- | ----------- | ----------------------------------------------------------------- |
| `id`                   | uuid (PK)   | Auto-generated                                                    |
| `session_id`           | uuid (FK)   | References `sessions` (cascades on delete)                        |
| `type`                 | text        | `session_started`, `session_ended`, `card_drawn`, `card_skipped`, `turn_passed` |
| `payload`              | jsonb       | Event-specific data (e.g. `card_id`, `target_participant_id`)      |
| `actor_participant_id` | uuid (FK)   | Participant that emitted the event; null for system events        |
| `turn_number`          | int         | Monotonic per session, set on `card_drawn`                         |
| `created_at`           | timestamptz | Defaults to now()                                                  |

#### How cards work

Cards are always authored in English. At runtime, the app uses the session's `target_language` and the receiver's `native_language` to look up the right translations:

- **Question**: shown in the practice language. If the receiver's native language matches the host's, practice = `target_language`; otherwise practice = host's native language. (This lets a Japanese-native host run a Japanese session for Dutch participants while still drilling the Dutch host's vocabulary in mixed groups.)
- **Hint**: `card_translations` row where `language` matches the receiver's `native_language`.
- If the receiver's native language is English, the hint comes directly from `cards.question`.
- For non-Latin practice languages, the optional `romanization` line is rendered under the question.

#### Editing cards

Card content lives in `supabase/cards.json` — one entry per card with English text, CEFR level, and translations for every supported language. `supabase/seed.sql` is generated from it; do not edit the SQL by hand.

To add or change cards:

1. Edit `supabase/cards.json`.
2. Regenerate the seed file:

   ```sh
   node scripts/generate-seed.js
   ```

3. Apply the new seed:

   ```sh
   make reset-db
   ```

The generator validates that every card has a unique id, a valid CEFR level, and translations for Dutch and Japanese. It exits non-zero on bad input.

Content authored by anyone other than a native speaker should be reviewed by one before going in front of users.

## Project Structure

```
language-cafe/
├── app/                    # React + Vite project
│   ├── src/                # Application source code
│   ├── public/             # Static assets
│   ├── package.json
│   └── vite.config.ts
├── docker/
│   ├── dev.Dockerfile      # Development container
│   ├── prod.Dockerfile     # Production build (nginx)
│   └── kong.yml            # Supabase API gateway config
├── supabase/
│   ├── migrations/         # Numbered SQL migration files
│   └── seed.sql            # Test data for development
├── docker-compose.yml      # Development services
├── Makefile
├── .env.example
└── README.md
```