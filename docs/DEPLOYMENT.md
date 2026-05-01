# PesoTrace Deployment Guide

This document targets a Vercel frontend plus Render API deployment, while still applying to similar static SPA and Node API hosts.

## Suggested Host Pair

| Layer    | Option | Notes |
| -------- | ------ | ----- |
| API      | Render | Set `PORT` from the host, serve HTTPS, and connect to managed MySQL. |
| Frontend | Vercel | Build the Vite SPA and point `VITE_API_URL` at the API `/api` base URL. |

## Production Environment Matrix

Use Node `20.19+` or `22.12+` for installs/builds. This matches the Vite 8 toolchain used by the frontend build.

### Server (`server/`)

| Variable             | Required | Example / notes |
| -------------------- | -------- | --------------- |
| `NODE_ENV`           | Yes      | `production` |
| `PORT`               | Usually  | Provided by Render. |
| `CLIENT_ORIGIN`      | Yes      | Exact SPA origin, e.g. `https://your-app.vercel.app` with no trailing slash. |
| `JWT_SECRET`         | Yes      | At least 32 characters, high entropy, e.g. `openssl rand -base64 32`. |
| `MYSQL_*`            | Yes      | Use managed MySQL for production. |
| `MYSQL_STORE`        | No       | Keep unset or `true` for MySQL. Avoid `memory` in production. |
| `ALLOW_MEMORY_STORE` | No       | Must be `true` to allow `MYSQL_STORE=memory` when `NODE_ENV=production`. |
| `BCRYPT_ROUNDS`      | No       | Accepts `10`-`15`. Defaults to `12` in production, `10` otherwise. |

Use a managed MySQL instance and TLS when the provider supports it.

### Client (`client/`, build-time)

| Variable       | Required | Example |
| -------------- | -------- | ------- |
| `VITE_API_URL` | Yes      | `https://your-api.onrender.com/api` |

`client/src/api.js` appends route paths such as `/auth/login`, so the deployed value must include `/api`.

Build:

```bash
npm run build --workspace client
```

Output directory: `client/dist`.

## SPA Routing

The app uses `BrowserRouter` and paths such as `/dashboard/transactions`. The static host must serve `index.html` for all non-file routes.

- Vercel: `client/vercel.json` includes a rewrite rule; use the `client` folder as the project root, or copy `vercel.json` to the deployed root.
- Netlify: `client/public/_redirects` is copied to `dist/_redirects` on build.
- Render static / Nginx: configure `try_files $uri /index.html` or the host-specific SPA fallback.

## Database

1. Create a database and import schema:

   ```bash
   mysql -h <host> -u <user> -p < server/sql/schema.sql
   ```

2. Optional demo seed:

   ```bash
   npm run db:import-json --workspace server
   ```

## Schema Migrations

There is no ORM migration runner in-repo. For production changes, apply versioned SQL under [`server/sql/migrations/`](../server/sql/migrations/) in order, or adopt a migration tool and keep the same ordering discipline.

## Deployment Checklist

1. Run `npm test --workspace server`.
2. Run `npm test --workspace client`.
3. Run `npm run build`.
4. Run `npm audit --omit=dev --workspaces`.
5. Deploy the API and confirm `GET /api/health` returns `200` with `{"status":"ok"}`.
6. Deploy the SPA and confirm login works against the deployed API.
7. Open a deep link such as `/dashboard/reports` directly and confirm the static host serves the app.

## Post-Deploy Verification

1. HTTPS: Both SPA and API should be served over HTTPS.
2. Cookies: After login, the session cookie should include `HttpOnly`, `Secure`, and `SameSite=None` or `Lax` depending on cross-site layout.
3. CORS: `CLIENT_ORIGIN` must exactly match the browser origin calling the API.
4. Smoke test: Register or log in, create a transaction, update the password, and log out.

## Telemetry

v1 can ship without client telemetry. If you add Sentry, PostHog, or similar tooling, document keys only via host environment variables and never commit secrets.

## Rotating Leaked Keys

If any API key or `JWT_SECRET` was exposed in chat or a public repo, rotate it at the provider, replace environment variables on every environment, and invalidate old sessions by changing `JWT_SECRET`.
