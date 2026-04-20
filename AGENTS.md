# Repository Guidelines

## Project Structure & Module Organization

`PesoTrace` is a monorepo with two workspaces:

- `client/` React + Vite frontend. Main app code lives in `client/src/`, with feature folders under `components/`, `pages/`, `hooks/`, and `utils/`.
- `server/` Node.js + Express API. Source code is in `server/src/`, with tests alongside implementation files using `*.test.js`.
- `server/sql/` contains the database schema, and `server/scripts/` holds data import helpers.
- `scripts/` contains repo-level automation such as `dev.cjs`.

## Build, Test, and Development Commands

- `npm install` installs root workspace dependencies.
- `npm run dev` starts both client and server using the root helper script.
- `npm run dev:client` starts only the Vite app.
- `npm run dev:server` starts only the API in watch mode.
- `npm run build` builds the client for production.
- `npm test --workspace server` runs the Node test suite with `node --test`.
- `npm run db:import-json --workspace server` imports the JSON demo store into MySQL.

## Coding Style & Naming Conventions

- Use 2-space indentation in JavaScript and JSX.
- Prefer ES modules, functional React components, and small focused modules.
- Use `PascalCase` for React components and page files, `camelCase` for functions, variables, and utilities.
- Keep test files named `*.test.js` beside the code they cover.
- No formatter or linter is configured in `package.json`; match the existing file style when editing.

## Testing Guidelines

- Server tests use Node's built-in test runner.
- Add or update tests for API, auth, finance, and store changes in `server/src/*.test.js`.
- Keep test names descriptive of the behavior being verified, not implementation details.
- Run `npm test --workspace server` before opening a PR.

## Commit & Pull Request Guidelines

- Recent commits use short Conventional Commit-style prefixes such as `feat:` and `fix:`.
- Keep commit subjects imperative and scoped, for example `feat: add transaction filters`.
- PRs should explain what changed, how it was verified, and any schema or env updates.
- Include screenshots or screen recordings for UI changes, and mention any MySQL migration or setup steps.

## Security & Configuration Tips

- Do not commit `.env` files or secrets. Use the provided `.env.example` files in `client/` and `server/`.
- Local MySQL setup is defined in `server/sql/schema.sql`; update config there, not in app code, when the schema changes.
