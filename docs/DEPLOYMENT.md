# PesoTrace — deployment guide

This document matches the recommended **API + SPA** split: Node/Express API on a container-friendly host and the Vite-built SPA on a static host with SPA rewrites.

## Suggested host pairs

| Layer    | Options                          | Notes                                      |
| -------- | -------------------------------- | ------------------------------------------ |
| API      | Render, Railway, Fly.io, etc.    | Set `PORT` from host; enable HTTPS only.   |
| Frontend | Vercel, Netlify, Cloudflare Pages | Point `VITE_API_URL` at the API public URL |

## Production environment matrix

### Server (`server/`)

| Variable                 | Required | Example / notes                                                                 |
| ------------------------ | -------- | --------------------------------------------------------------------------------- |
| `NODE_ENV`               | Yes      | `production`                                                                     |
| `PORT`                   | Usually  | Provided by platform (e.g. Render sets `PORT`).                                 |
| `CLIENT_ORIGIN`          | Yes      | Exact SPA origin, e.g. `https://your-app.vercel.app` (no trailing slash).         |
| `JWT_SECRET`             | Yes      | **≥ 32 characters**, high entropy (`openssl rand -base64 32`).                    |
| `MYSQL_*`                | Yes\*    | Omit or avoid `MYSQL_STORE=memory` in prod unless you intentionally use snapshots. |
| `BCRYPT_ROUNDS`          | No       | Default `12` in production, `10` otherwise.                                     |
| `ALLOW_MEMORY_STORE`     | No       | Must be `true` to allow `MYSQL_STORE=memory` when `NODE_ENV=production`.         |
| `ALLOW_LOCALHOST_DEV`    | No       | Never set in production; relaxes CORS for `localhost` dev ports.                 |

\*Use a managed MySQL instance (PlanetScale-compatible, RDS, Aiven, etc.) and TLS if the provider supports it.

### Client (`client/` — build-time)

| Variable       | Required | Example                          |
| -------------- | -------- | -------------------------------- |
| `VITE_API_URL` | Yes      | `https://your-api.onrender.com` |

Build:

```bash
npm run build --workspace client
```

Output directory: `client/dist`.

## SPA routing (deep links)

The app uses `BrowserRouter` and paths such as `/dashboard/transactions`. The static host must serve `index.html` for all non-file routes.

- **Vercel:** `client/vercel.json` includes a rewrite rule; use the `client` folder as the project root (or copy `vercel.json` to the deployed root).
- **Netlify:** `client/public/_redirects` is copied to `dist/_redirects` on build.
- **Render static / Nginx:** configure `try_files $uri /index.html` (or host-specific SPA fallback).

## Database

1. Create a database and import schema:

   ```bash
   mysql -h <host> -u <user> -p < server/sql/schema.sql
   ```

2. Optional demo seed:

   ```bash
   npm run db:import-json --workspace server
   ```

## Schema migrations

There is no ORM migration runner in-repo. For production changes, apply versioned SQL under [`server/sql/migrations/`](../server/sql/migrations/) (see README there) in order, or adopt a tool (e.g. Flyway, Liquibase, or a small Node migration runner) and keep the same ordering discipline.

## Health checks

Configure the platform health probe to:

```http
GET /api/health
```

Expect `200` and JSON including `"status":"ok"`.

## Post-deploy verification

1. **HTTPS:** Both SPA and API should be served over HTTPS.
2. **Cookies:** After login, session cookie should include `HttpOnly`, `Secure`, `SameSite=None` or `Lax` depending on cross-site layout (see `server/src/auth.js`).
3. **CORS:** `CLIENT_ORIGIN` must exactly match the browser origin calling the API.
4. **Smoke test:** Register/login, open `/dashboard/reports` directly (deep link), confirm no 404 from the static host.

## Telemetry (optional)

v1 can ship without client telemetry. If you add Sentry/PostHog/etc., document keys only via host env UI — never commit secrets.

## Rotating leaked keys

If any API key or `JWT_SECRET` was exposed in chat or a public repo: rotate at the provider, replace env vars on all environments, and invalidate old sessions by changing `JWT_SECRET` (users will need to sign in again).
