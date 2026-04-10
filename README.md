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
- Persistence: local JSON datastore for a self-contained demo setup
- Auth: JWT + bcrypt password hashing

## Project Structure

```text
client/   React user interface
server/   Express API and persistent data storage
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

3. Start both apps:

   ```bash
   npm run dev
   ```

4. Open the client in your browser:

   ```text
   http://localhost:5173
   ```

The API runs on `http://localhost:5000`.

## Notes

- The documentation suggested React and Node.js, which this implementation follows.
- The documentation listed MySQL, MongoDB, or PostgreSQL as suggested databases. For this local classroom build, persistence is implemented with a JSON datastore so the project can run immediately without external database setup.
- Transactions are expense-only because income tracking was listed under future improvements and was intentionally left out.

ACCOUNT:
- Name:OjayAca                                                                                    
  - Email: ojayacasio@gmail.com                                                                       
  - Created: 2026-04-02T16:05:29.710Z   