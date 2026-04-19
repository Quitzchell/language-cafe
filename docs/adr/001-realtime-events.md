# ADR 001 — Realtime event model for gameplay

**Status**: Accepted
**Date**: 2026-04-18
**Ticket**: LC-23

## Context

LC-5 (host waiting room) and LC-6 (participant join) set up a single realtime channel: `supabase_realtime` publishes `INSERT`s on `participants`, and host/participant rooms subscribe to that one stream. This works for "someone joined" but does not scale to the gameplay tickets:

- **LC-7** dealer picks a participant, draws a card.
- **LC-8** dealer skips a card, a new card is drawn at the same level.
- **LC-9** dealer passes the turn to the next participant.

Each of these needs to be communicated to every client in the session within ~1 second and in a consistent order. We need to commit to the synchronisation model before starting LC-7, otherwise we retrofit later.

## Alternatives considered

### A. Per-table CDC
Expand the publication to cover `session_cards_used`, plus a future `turns` table, and have each client subscribe to every table it cares about. Pros: minimal indirection, each event is a typed row. Cons: adding events = schema changes; ordering across tables is fuzzy; clients need multiple subscriptions.

### B. `session_events` append-only log *(chosen)*
One table carrying every gameplay event. Published as-is. Clients subscribe once and branch on `type`.

## Decision

Adopt a `session_events` table as the single realtime channel for gameplay.

### Schema sketch

```sql
CREATE TABLE session_events (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   uuid        NOT NULL REFERENCES sessions (id) ON DELETE CASCADE,
    type         text        NOT NULL,
    payload      jsonb       NOT NULL DEFAULT '{}'::jsonb,
    actor_participant_id uuid NULL REFERENCES participants (id) ON DELETE SET NULL,
    turn_number  int         NULL,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX session_events_session_id_created_at ON session_events (session_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE session_events;
```

### Initial event types

| `type`           | payload (example)                                    | Notes |
| ---------------- | ---------------------------------------------------- | ----- |
| `session_started` | `{}`                                                 | emitted when host presses "Start sessie" |
| `card_drawn`      | `{ "card_id": "<uuid>", "target_participant_id": "<uuid>", "practice_language": "<lang>", "native_language": "<lang>" }` | `turn_number` set; `practice_language`/`native_language` are resolved server-side so the event is self-contained for replay. The `card_id` → prior history query answers "which cards has this participant already seen?" |
| `card_skipped`    | `{ "card_id": "<uuid>" }`                            | same `turn_number` as the draw it replaces |
| `turn_passed`     | `{ "next_participant_id": "<uuid>" }`                | increments `turn_number` for the cycle |
| `session_ended`   | `{ "reason": "host" \| "inactivity" }`               | participants use this to route to the "Sessie beëindigd" screen |

### Turn tracking

`turn_number` is a monotonically increasing int scoped to the session. Within a "cycle" (every participant gets one turn), the host computes whose turn is next by looking at `turn_passed` events whose `turn_number` falls into the current cycle and whose `next_participant_id` hasn't appeared yet. That keeps cycle logic in the client — no DB state to maintain beyond the log.

For card dedup ("has this participant already had this card?"), query `session_events` where `type = 'card_drawn'` and `payload ->> 'target_participant_id' = :id`. The prior `session_cards_used` table becomes redundant and can be removed in the gameplay tickets.

### Lifecycle and cleanup

When `sessions.status` transitions to `ended` (LC-24 and LC-25), delete all `session_events` rows for that session in the same transaction. The log has no value post-game; a session is effectively ephemeral.

```sql
-- Pseudocode, runs inside a SECURITY DEFINER function:
UPDATE sessions SET status = 'ended', ended_at = now() WHERE id = :session_id;
DELETE FROM session_events WHERE session_id = :session_id;
```

### RLS

`session_events` will be RLS-enabled in the LC-24 migration:

- `SELECT USING (true)` — any client that knows the session id can see its events. Consistent with sessions/participants.
- `INSERT WITH CHECK (...)` — validate the inserting client's `actor_participant_id` belongs to the session. The client passes its own participantId (persisted in `sessionStorage`); the policy checks `EXISTS (participant in session)`.
- No `UPDATE`/`DELETE` from anon. Cleanup runs through `service_role` (the auto-end edge function) or a `SECURITY DEFINER` function the host's "End session" button calls.

## Consequences

- One publication, one subscription per client — simpler than A.
- Adding a new event type = no schema change, just a new `type` string.
- `payload jsonb` gives up strict typing at the DB layer, but client-side a discriminated union keeps it honest:
  ```ts
  type SessionEvent =
    | { type: 'session_started'; payload: {} }
    | { type: 'card_drawn'; payload: { card_id: string; target_participant_id: string } }
    | ...
  ```
- History is explicitly not durable. If we ever need post-game review, we'll persist a summary separately at `ended` time; the log itself stays ephemeral.
