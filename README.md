# Language Cafe

A React + Vite application with Supabase, running in Docker.

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

1. Create a new numbered SQL file in `supabase/migrations/`:

   ```
   supabase/migrations/006_create_new_table.sql
   ```

2. Reset the database to apply it:

   ```sh
   make reset-db
   ```

### Schema

#### `sessions`

A language practice session created by a host.

| Column           | Type        | Description                     |
| ---------------- | ----------- | ------------------------------- |
| `id`             | uuid (PK)   | Auto-generated                  |
| `title`          | text        | Name chosen by the host         |
| `target_language`| text        | Language being practiced        |
| `created_at`     | timestamptz | Defaults to now()               |

#### `participants`

People who join a session. The first participant is typically the host.

| Column             | Type        | Description                          |
| ------------------ | ----------- | ------------------------------------ |
| `id`               | uuid (PK)   | Auto-generated                       |
| `session_id`       | uuid (FK)   | References `sessions`                |
| `display_name`     | text        | Chosen by the participant            |
| `native_language`  | text        | Participant's mother tongue          |
| `proficiency_level`| text        | CEFR level: A1, A2, B1, B2, C1, C2  |
| `is_host`          | boolean     | Whether this participant is the host |
| `joined_at`        | timestamptz | Defaults to now()                    |

Unique constraint on `(session_id, display_name)`.

#### `cards`

Conversation prompt questions, always stored in English.

| Column             | Type      | Description                         |
| ------------------ | --------- | ----------------------------------- |
| `id`               | uuid (PK) | Auto-generated                      |
| `question`         | text      | The question in English             |
| `proficiency_level`| text      | CEFR level: A1, A2, B1, B2, C1, C2 |

#### `card_translations`

Translations of card questions into supported languages (Dutch, Japanese).

| Column        | Type      | Description                  |
| ------------- | --------- | ---------------------------- |
| `id`          | uuid (PK) | Auto-generated               |
| `card_id`     | uuid (FK) | References `cards`           |
| `language`    | text      | Target language              |
| `translation` | text      | The question in that language|

Unique constraint on `(card_id, language)`.

#### `session_cards_used`

Tracks which card was shown to which participant during a session.

| Column           | Type        | Description               |
| ---------------- | ----------- | ------------------------- |
| `id`             | uuid (PK)   | Auto-generated            |
| `session_id`     | uuid (FK)   | References `sessions`     |
| `card_id`        | uuid (FK)   | References `cards`        |
| `participant_id` | uuid (FK)   | References `participants` |
| `used_at`        | timestamptz | Defaults to now()         |

#### How cards work

Cards are always authored in English. At runtime, the app uses the session's `target_language` and the participant's `native_language` to look up the right translations:

- **Question**: `card_translations` row where `language` matches `session.target_language`
- **Hint**: `card_translations` row where `language` matches `participant.native_language`
- If the participant's native language is English, the hint comes directly from `cards.question`

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