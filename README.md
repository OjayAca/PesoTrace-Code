# PesoTrace

PesoTrace is a full-stack personal finance tracker built from the project documentation in [`PesoTrace_Final_Project_Documentation.docx`](./PesoTrace_Final_Project_Documentation.docx). It focuses on the documented deliverables only:

- Multi-user registration and login
- Dashboard with monthly finance summary
- Add, edit, and delete expense transactions
- Monthly budget tracking with remaining balance or deficit
- Private per-user transaction history

Future improvements from the document were intentionally excluded.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Persistence: MySQL
- Auth: JWT session cookie + bcrypt password hashing

## Project Structure

```text
client/   React user interface
server/   Express API, MySQL schema, and migration scripts
```

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment examples if you want custom values:

   ```bash
   Copy-Item .\server\.env.example .\server\.env
   Copy-Item .\client\.env.example .\client\.env
   ```

   `JWT_SECRET` is required for the server. The API will refuse to start if it is missing.

   The server defaults to MySQL. Use `MYSQL_STORE=memory` only if you explicitly want to run against the bundled JSON snapshot during development.

3. Start both apps:

   ```bash
   npm run dev
   ```

4. Open the client in your browser:

   ```text
   http://localhost:5173
   ```

The API runs on `http://localhost:5000`.

## MySQL Setup

1. Create the database schema:

   ```bash
   mysql -u root -p < server/sql/schema.sql
   ```

2. Configure the server connection in `server/.env`:

   ```text
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=change-me
   MYSQL_DATABASE=pesotrace
   ```

   Keep `MYSQL_STORE=true` for the normal MySQL-backed runtime.

3. If you want to move the existing JSON demo data into MySQL, run:

   ```bash
   npm run db:import-json --workspace server
   ```

## Notes

- The documentation suggested React and Node.js, which this implementation follows.
- The server keeps the same REST endpoints and JSON response shapes after the MySQL migration, so the React client does not need API changes.
- MySQL is the default persistence layer; the JSON snapshot is available only through the explicit `MYSQL_STORE=memory` mode.
- Browser sessions are stored in an `HttpOnly` cookie rather than `localStorage`.
- The database schema is defined in [server/sql/schema.sql](./server/sql/schema.sql).

ACCOUNT:
- Name:OjayAca                                                                                    
  - Email: ojayacasio@gmail.com                                                                       
  - Created: 2026-04-02T16:05:29.710Z   
