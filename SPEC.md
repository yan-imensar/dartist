# Darts App - Product and Technical Specification

## Goal

Build a simple, ad-free darts scoring app for personal use, playable offline, with optional synchronization of players, match history, and statistics through a self-hosted server.

The app must be pleasant to use during a real darts session: fast input, readable scores, no account required for local play, and no dependency on network connectivity while a match is in progress.

## Stack

Use this stack unless there is a strong reason to change it:

- Frontend/app: SvelteKit + TypeScript
- UI: Svelte components, mobile-first responsive design
- Local database: IndexedDB through Dexie
- PWA: installable, offline-capable
- Backend sync: PocketBase, self-hosted
- Server exposure: NetBird reverse proxy
- Tests: Vitest for game logic, Playwright later for end-to-end flows

The app should be local-first. PocketBase is only a sync layer, not a runtime dependency for scoring.

## Non-Goals For V1

- No public app store release.
- No ads, tracking, analytics, or third-party monetization SDKs.
- No mandatory login.
- No complex P2P sync.
- No real-time multiplayer requirement for V1.
- No AI opponent or advanced match prediction.
- No tournament bracket management in the first version.

## Product Principles

1. A user can start scoring in a few seconds.
2. A match must remain playable without internet.
3. Data belongs to the user and is stored locally first.
4. Sync should be invisible when it works and non-blocking when it fails.
5. The UI should be practical at arm's length near a dartboard.
6. Corrections should be easy because scoring mistakes happen often.

## Core User Stories

### Local Play

- As a player, I can create local players without creating an account.
- As a player, I can start a 301 or 501 match with 1 to N players.
- As a player, I can enter a turn quickly.
- As a player, I can undo the last turn.
- As a player, I can correct an earlier turn.
- As a player, I can finish a leg using double-out rules.
- As a player, I can see the current score, current player, previous turns, and suggested checkout.
- As a player, I can view match history and basic stats.

### Offline

- As a player, I can open the installed app without network.
- As a player, I can start and finish a match offline.
- As a player, I can see local history and stats offline.
- As a player, I do not lose data if I close the app mid-match.

### Sync

- As a player, I can configure a PocketBase server URL.
- As a player, I can optionally sign in for sync.
- As a player, I can push local players, matches, turns, and stats to the server.
- As a player, I can pull my data on another device.
- As a player, I can keep playing if sync fails.

## Game Modes

### V1 Required

#### X01

Support:

- 301
- 501
- 1 to N players
- straight-in by default
- double-out by default
- bust handling
- undo last turn
- correction flow
- leg winner

Rules:

- Each player starts with the selected starting score.
- A turn contains up to 3 darts.
- A player score decreases by the valid turn score.
- If the score would go below 0, to 1, or to 0 without a finishing double when double-out is enabled, the turn is a bust.
- On bust, the player's score returns to the value before the turn and the next player starts.
- A valid finish ends the leg.

### V1 Optional

#### Around the Clock

Players target numbers 1 through 20 in order. Track current target per player and number of darts used.

### Later

- Cricket
- Shanghai
- Bob's 27
- Count Up
- Practice mode
- Best of legs / sets
- Match templates

## UX Requirements

The app is primarily used on a phone or tablet near a dartboard.

### Main Navigation

Recommended sections:

- Play
- Players
- History
- Stats
- Settings

### Play Flow

1. Select game mode.
2. Select or create players.
3. Configure options.
4. Start match.
5. Enter turns.
6. Finish leg.
7. Save match automatically.

### Match Screen

Must show:

- current player
- all player scores
- current leg status
- numeric turn entry
- recent turns
- undo button
- correction entry point
- checkout suggestion when relevant

Turn entry should support at least:

- simple total entry, for example `60`
- miss as `0`
- bust button

Later, add per-dart input:

- `S20`, `D20`, `T20`
- bull and outer bull
- automatic double-out validation

### Visual Design

Keep the UI functional and focused:

- large score display
- high contrast
- compact match controls
- no marketing-style landing page
- no decorative clutter
- buttons large enough for quick use
- clear current-player state

## Domain Model

Prefer event-like storage for match activity. A thrown turn should be append-only in normal operation. Corrections should be represented explicitly instead of mutating history silently.

### Local Entities

Use UUIDs generated client-side for all local records.

#### Device

Represents the current installation.

Fields:

- `id`: string
- `name`: string
- `createdAt`: ISO string

#### Player

Fields:

- `id`: string
- `name`: string
- `color`: string optional
- `avatarUrl`: string optional
- `createdAt`: ISO string
- `updatedAt`: ISO string
- `deletedAt`: ISO string nullable
- `syncState`: `local` | `pending` | `synced` | `conflict`
- `remoteId`: string nullable

#### Match

Fields:

- `id`: string
- `mode`: `x01` | `around_the_clock`
- `status`: `draft` | `active` | `finished` | `abandoned`
- `createdAt`: ISO string
- `startedAt`: ISO string nullable
- `finishedAt`: ISO string nullable
- `updatedAt`: ISO string
- `settings`: JSON
- `winnerPlayerId`: string nullable
- `syncState`: `local` | `pending` | `synced` | `conflict`
- `remoteId`: string nullable

Example `settings` for X01:

```json
{
  "startingScore": 501,
  "doubleOut": true,
  "straightIn": true,
  "maxDartsPerTurn": 3
}
```

#### MatchPlayer

Fields:

- `id`: string
- `matchId`: string
- `playerId`: string
- `position`: number
- `startingScore`: number
- `finalRank`: number nullable

#### Turn

Fields:

- `id`: string
- `matchId`: string
- `playerId`: string
- `legId`: string nullable
- `turnIndex`: number
- `createdAt`: ISO string
- `enteredAt`: ISO string
- `scoreBefore`: number
- `scoreEntered`: number
- `scoreApplied`: number
- `scoreAfter`: number
- `isBust`: boolean
- `isCheckout`: boolean
- `darts`: JSON
- `correctionOfTurnId`: string nullable
- `revertedAt`: ISO string nullable
- `syncState`: `local` | `pending` | `synced` | `conflict`
- `remoteId`: string nullable

Example `darts`:

```json
[
  { "segment": 20, "multiplier": 3, "score": 60 },
  { "segment": 20, "multiplier": 1, "score": 20 },
  { "segment": 5, "multiplier": 1, "score": 5 }
]
```

For simple total entry, `darts` can be empty and `scoreEntered` is the source of truth.

#### Leg

Fields:

- `id`: string
- `matchId`: string
- `legIndex`: number
- `status`: `active` | `finished`
- `startedAt`: ISO string
- `finishedAt`: ISO string nullable
- `winnerPlayerId`: string nullable

V1 can create one leg per match. Multi-leg support can be added without changing the turn model.

#### SyncQueueItem

Fields:

- `id`: string
- `entityType`: `player` | `match` | `matchPlayer` | `leg` | `turn`
- `entityId`: string
- `operation`: `upsert` | `delete`
- `payload`: JSON
- `createdAt`: ISO string
- `attempts`: number
- `lastAttemptAt`: ISO string nullable
- `lastError`: string nullable

## Local Database

Use Dexie with explicit versioned schema migrations.

Recommended tables:

- `devices`
- `players`
- `matches`
- `matchPlayers`
- `legs`
- `turns`
- `syncQueue`
- `settings`

Indexes:

- players: `id`, `name`, `updatedAt`, `syncState`
- matches: `id`, `status`, `createdAt`, `updatedAt`, `syncState`
- matchPlayers: `id`, `matchId`, `playerId`
- legs: `id`, `matchId`, `legIndex`
- turns: `id`, `matchId`, `playerId`, `legId`, `turnIndex`, `syncState`
- syncQueue: `id`, `entityType`, `entityId`, `createdAt`

## Game Logic Architecture

All scoring logic must live in pure TypeScript functions under `src/lib/game`.

Do not put scoring rules directly inside Svelte components.

Recommended files:

```txt
src/lib/game/types.ts
src/lib/game/x01.ts
src/lib/game/checkouts.ts
src/lib/game/validation.ts
src/lib/game/around-the-clock.ts
```

### X01 Function Contract

Implement a pure function like:

```ts
type X01Settings = {
  startingScore: 301 | 501 | number;
  doubleOut: boolean;
  straightIn: boolean;
  maxDartsPerTurn: number;
};

type ApplyTurnInput = {
  scoreBefore: number;
  scoreEntered: number;
  darts?: DartThrow[];
  settings: X01Settings;
};

type ApplyTurnResult = {
  scoreApplied: number;
  scoreAfter: number;
  isBust: boolean;
  isCheckout: boolean;
  reason?: 'below_zero' | 'left_one' | 'double_out_required';
};
```

Expected behavior:

- `scoreBefore=501`, `scoreEntered=60` gives `scoreAfter=441`.
- `scoreBefore=40`, `scoreEntered=40`, last dart double 20 gives checkout if double-out is enabled.
- `scoreBefore=40`, `scoreEntered=40`, no dart detail gives checkout only if simple total mode is allowed to confirm double separately.
- `scoreBefore=40`, `scoreEntered=41` busts.
- `scoreBefore=40`, `scoreEntered=39` busts because it leaves 1.
- `scoreBefore=40`, `scoreEntered=40`, non-double finish busts when double-out is enabled.

If the app starts with simple total entry only, finishing on zero with double-out should require an explicit confirmation:

- user enters `40`
- app asks or displays "finish with double?"
- if confirmed, store `isCheckout=true`
- if rejected, mark bust or require per-dart detail

## Checkout Suggestions

V1 can include a basic checkout table for common values from 2 to 170.

Behavior:

- show suggestion only for current player
- show nothing above 170
- show "No checkout" for impossible values
- keep suggestions advisory; they must not affect scoring

Implementation:

- static map in `src/lib/game/checkouts.ts`
- tests for representative values

## Sync Architecture

Sync must be optional and resilient.

### Principles

- The local DB is the source of truth while playing.
- Every local write that should be synchronized adds or updates a `syncQueue` item.
- Sync runs in the background when enabled and authenticated.
- Sync failure does not block the UI.
- Sync conflicts are rare because turns are append-only.

### PocketBase Collections

Recommended collections:

#### users

Use PocketBase auth collection.

#### players

Fields:

- `owner`: relation to user
- `clientId`: text
- `deviceId`: text
- `name`: text
- `color`: text optional
- `avatar`: file optional
- `deletedAt`: date optional
- `updatedAtClient`: date

Unique suggested index:

- `owner + clientId`

#### matches

Fields:

- `owner`: relation to user
- `clientId`: text
- `deviceId`: text
- `mode`: select
- `status`: select
- `settings`: json
- `startedAt`: date optional
- `finishedAt`: date optional
- `winnerClientPlayerId`: text optional
- `deletedAt`: date optional
- `updatedAtClient`: date

#### match_players

Fields:

- `owner`: relation to user
- `clientId`: text
- `matchClientId`: text
- `playerClientId`: text
- `position`: number
- `startingScore`: number
- `finalRank`: number optional
- `updatedAtClient`: date

#### legs

Fields:

- `owner`: relation to user
- `clientId`: text
- `matchClientId`: text
- `legIndex`: number
- `status`: select
- `startedAt`: date
- `finishedAt`: date optional
- `winnerClientPlayerId`: text optional
- `updatedAtClient`: date

#### turns

Fields:

- `owner`: relation to user
- `clientId`: text
- `matchClientId`: text
- `legClientId`: text optional
- `playerClientId`: text
- `turnIndex`: number
- `scoreBefore`: number
- `scoreEntered`: number
- `scoreApplied`: number
- `scoreAfter`: number
- `isBust`: bool
- `isCheckout`: bool
- `darts`: json
- `correctionOfTurnClientId`: text optional
- `revertedAt`: date optional
- `enteredAt`: date
- `updatedAtClient`: date

### Client IDs vs Remote IDs

Every local entity uses a stable local UUID named `id`.

When synchronized, store PocketBase's record ID in `remoteId`.

PocketBase records also store the local UUID in `clientId`. This allows another device to preserve identity and avoid duplicate imports.

### Push Flow

1. Read pending `syncQueue` items ordered by `createdAt`.
2. For each item:
   - if entity has `remoteId`, update remote record
   - otherwise upsert by `owner + clientId`
   - save returned `remoteId` locally
   - mark entity `syncState='synced'`
   - remove queue item
3. On error:
   - increment `attempts`
   - store `lastError`
   - continue later

### Pull Flow

1. Store a `lastPulledAt` timestamp in local settings.
2. Query PocketBase records changed since `lastPulledAt`.
3. Upsert into local DB by `clientId`.
4. Do not overwrite local pending records blindly.
5. If remote and local both changed:
   - for append-only turns, keep both unless duplicate `clientId`
   - for player names/settings, prefer latest `updatedAtClient`
   - mark `conflict` if unsure

### Conflict Rules

V1 can be simple:

- Turns: append-only, deduplicate by `clientId`.
- Matches: latest `updatedAtClient` wins, unless local is active.
- Active local match should not be overwritten by remote status.
- Players: latest `updatedAtClient` wins.
- Deletions: `deletedAt` wins if newer than local update.

## PWA Requirements

Use a SvelteKit-compatible PWA setup. The implementation may use a maintained Vite PWA plugin if compatible with the chosen SvelteKit version.

Requirements:

- installable manifest
- service worker
- app shell cached
- offline fallback
- local DB available offline
- no blank page after reload while offline

Recommended caching:

- precache app shell and built assets
- network-first or stale-while-revalidate for non-critical static assets
- never require network for match screen state

## Settings

Settings should include:

- device name
- PocketBase server URL
- sync enabled/disabled
- authenticated user state
- last successful sync timestamp
- preferred default game mode
- default X01 starting score
- double-out default

## Suggested Folder Structure

```txt
src/
  lib/
    db/
      client.ts
      schema.ts
      repositories/
        players.ts
        matches.ts
        turns.ts
    game/
      types.ts
      x01.ts
      checkouts.ts
      validation.ts
      around-the-clock.ts
    sync/
      pocketbase.ts
      sync-engine.ts
      mappers.ts
      queue.ts
    stores/
      active-match.ts
      sync-status.ts
    ui/
      Button.svelte
      PlayerBadge.svelte
      ScorePanel.svelte
      TurnEntry.svelte
  routes/
    +layout.svelte
    +page.svelte
    play/
      +page.svelte
      [matchId]/
        +page.svelte
    players/
      +page.svelte
    history/
      +page.svelte
    stats/
      +page.svelte
    settings/
      +page.svelte
```

## Implementation Phases

### Phase 1 - Project Setup

- Create SvelteKit project with TypeScript.
- Add linting and formatting.
- Add Vitest.
- Add Dexie.
- Add basic app layout and navigation.
- Add PWA support.

Acceptance criteria:

- App runs locally.
- App can be installed as PWA in supported browsers.
- Tests run.

### Phase 2 - Game Engine

- Implement X01 types and scoring function.
- Implement bust logic.
- Implement checkout detection.
- Implement checkout suggestions.
- Add unit tests.

Acceptance criteria:

- X01 rules are covered by tests.
- No Svelte component contains scoring rules.

### Phase 3 - Local Data

- Implement Dexie schema.
- Implement repositories.
- Implement local players CRUD.
- Implement match creation.
- Persist active match, turns, and match result.

Acceptance criteria:

- User can create players.
- User can start a 501 match.
- Closing and reopening the app preserves state.

### Phase 4 - Match UI

- Build match screen.
- Build simple total turn entry.
- Show current player and all scores.
- Implement undo last turn.
- Implement finish flow.
- Implement recent turns list.

Acceptance criteria:

- A full 501 match can be played locally.
- Busts are handled correctly.
- A match can finish and appear in history.

### Phase 5 - Stats

Add basic local stats:

- matches played
- matches won
- legs won
- average score per turn
- highest turn
- checkout count
- checkout percentage if data allows

Acceptance criteria:

- Stats are computed from local match and turn data.
- Stats update after a match finishes.

### Phase 6 - PocketBase Sync

- Add PocketBase SDK.
- Add server URL setting.
- Add auth screen or settings section.
- Create sync queue.
- Implement push.
- Implement pull.
- Add sync status indicator.

Acceptance criteria:

- Local data syncs to PocketBase after login.
- Data can be pulled on another device.
- App remains usable when PocketBase is unreachable.

### Phase 7 - Hardening

- Improve correction flow.
- Add import/export backup.
- Add Playwright smoke tests.
- Improve offline reload behavior.
- Add better sync conflict display.

## Testing Strategy

### Unit Tests

Prioritize game logic:

- normal score application
- bust below zero
- bust leaving one
- double-out success
- double-out failure
- checkout suggestions
- player rotation
- undo behavior

### Repository Tests

If practical, test Dexie repositories with fake IndexedDB.

### Manual Test Checklist

- Create player offline.
- Start 501 match offline.
- Enter multiple turns.
- Trigger bust.
- Undo last turn.
- Finish with double-out.
- Close browser and reopen.
- Confirm active match persists.
- Install PWA.
- Reload app offline.
- Enable sync with server.
- Push local data.
- Pull data on second browser/device.

## Security and Privacy

- Do not add third-party analytics.
- Do not send data anywhere except the configured PocketBase server.
- Store auth token using the PocketBase SDK default mechanism unless a better local strategy is chosen.
- Treat server URL as user-configurable.
- Keep local play available without authentication.

## Environment Configuration

Use environment variables only for defaults, not hard requirements.

Possible variables:

```txt
PUBLIC_DEFAULT_POCKETBASE_URL=
```

The user must be able to override the server URL in settings.

## PocketBase Deployment Notes

PocketBase can run on the home server behind NetBird reverse proxy.

Recommended:

- run PocketBase as a service
- persist the PocketBase data directory
- enable HTTPS through the reverse proxy
- backup the PocketBase data directory regularly

The app should accept a URL like:

```txt
https://darts.example.netbird-domain
```

## Data Backup

Add an export/import feature after the first working sync:

- export local data as JSON
- import JSON after confirmation
- include schema version in export

This gives a recovery path even if sync is disabled.

## Definition of Done For V1

V1 is done when:

- the app is installable as a PWA
- 301 and 501 can be played locally
- local players can be managed
- match history is persisted
- basic stats exist
- the app works offline after installation
- PocketBase sync can push and pull player/match/turn data
- sync failure does not break local play
- core scoring logic has unit tests

## Recommended First Task For An Implementing Agent

Start by scaffolding the SvelteKit TypeScript project in this directory, then implement the pure X01 game engine and tests before building UI.

Do not implement PocketBase sync first. The correct order is:

1. game engine
2. local persistence
3. match UI
4. PWA offline support
5. sync

