# Dartist

Local-first darts scoring PWA. Plays X01 (301 / 501) with bust handling, double-out, undo, checkout suggestions, match history and per-player stats. Works offline once installed. No account, no tracking.

Built with SvelteKit + TypeScript, Dexie (IndexedDB), Tailwind v4, and `@vite-pwa/sveltekit`. Authentication is intentionally **not** part of the app — when self-hosting behind an OIDC-aware reverse proxy (e.g. NetBird, oauth2-proxy, Authelia), the proxy handles access control.

## Features

- X01 scoring (301 / 501) with bust rules, double-out, undo, correction.
- Checkout suggestions for 2..170.
- Local players, match history, per-player stats (matches won, legs won, average per turn, highest turn, checkouts).
- Installable PWA, offline-capable. App shell + IndexedDB survive offline.
- Pure TypeScript game engine, fully unit-tested.

## Get started (local dev)

```sh
git clone https://github.com/yan-imensar/dartist.git
cd dartist
npm ci
npm run dev
```

Open <http://localhost:5173>.

Common commands:

| Command         | What it does                                       |
| --------------- | -------------------------------------------------- |
| `npm run dev`   | Vite dev server with HMR.                          |
| `npm test`      | Unit tests (Vitest).                               |
| `npm run check` | TypeScript + Svelte type-check.                    |
| `npm run lint`  | Prettier + ESLint.                                 |
| `npm run build` | Production build via `@sveltejs/adapter-node`.     |
| `node build`    | Run the production server (after `npm run build`). |

## Run with Docker

A multi-stage `Dockerfile` builds the SvelteKit app and ships it inside `node:22-alpine`. The image listens on `0.0.0.0:3000` and only serves the SPA — no embedded reverse proxy, no auth layer.

```sh
docker build -t dartist:local .
docker run --rm -p 3000:3000 dartist:local
```

Or pull the published image:

```sh
docker pull ghcr.io/yan-imensar/dartist:latest
docker run --rm -p 3000:3000 ghcr.io/yan-imensar/dartist:latest
```

### docker-compose example

`compose.yaml`:

```yaml
services:
  dartist:
    image: ghcr.io/yan-imensar/dartist:latest
    container_name: dartist
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      # Required when reached through a public domain so SvelteKit
      # generates correct absolute URLs.
      ORIGIN: https://dartist.example.com
      # Optional (defaults shown).
      PORT: '3000'
      HOST: 0.0.0.0
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://127.0.0.1:3000/']
      interval: 30s
      timeout: 3s
      retries: 3
```

Bring it up:

```sh
docker compose up -d
```

### Behind a reverse proxy

The app does not terminate TLS and does not handle authentication. Front it with whatever you already run:

- **NetBird** with OIDC enforcement → point an Ingress / proxy rule at `dartist:3000`.
- **Traefik / Caddy / nginx** with forward-auth → same idea.
- **Tailscale Funnel** → set `ORIGIN` to the public URL, expose port 3000.

The only env var the app cares about for that case is `ORIGIN` (adapter-node uses it to build OAuth-like absolute URLs and for CSRF checks).

## Project layout

```
src/
  lib/
    db/            Dexie schema + repositories
    game/          Pure X01 engine, checkouts, match controller
    match/         MatchSession orchestration (engine + repos)
    settings/      Local key/value settings (device name, …)
    stats/         Pure stats compute + loader
    stores/        Svelte 5 rune stores (active match, …)
    ui/            Presentational Svelte components
  routes/          SvelteKit pages: /, /play, /play/[matchId],
                   /players, /history, /stats, /settings
```

All scoring logic lives in `src/lib/game/` as pure functions. Svelte components never contain rules.

## Tests

```sh
npm test           # 60+ Vitest unit tests (engine, repos, controller, stats, settings)
npm run check      # svelte-check
npm run lint       # prettier + eslint
```

## License

[MIT](./LICENSE).
