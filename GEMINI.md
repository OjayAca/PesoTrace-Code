# PesoTrace Project Context

PesoTrace is a full-stack personal finance tracker designed for monthly finance management. It provides multi-user registration, budget tracking, transaction history, and reporting features.

## Project Overview

- **Purpose:** Track expenses, income, and budgets with a focus on monthly summaries and recurring entries.
- **Architecture:** Monorepo with a decoupled frontend and backend using npm workspaces.
- **Main Technologies:**
    - **Frontend:** React, Vite, Lucide React (icons), Vanilla CSS.
    - **Backend:** Node.js, Express.
    - **Database:** MySQL (via `mysql2`).
    - **Authentication:** JWT (JSON Web Tokens) and bcrypt password hashing.

## Project Structure

- `client/`: React-based user interface.
    - `src/components/`: Reusable UI components (Common, Auth, etc.).
    - `src/pages/`: Main application screens (Dashboard, AuthScreen).
    - `src/hooks/`: Custom React hooks (useTheme).
    - `src/utils/`: Helper functions, formatters, and constants.
- `server/`: Express API, MySQL schema, data store, and authentication logic.
- `scripts/`: Development and utility scripts.
- `PesoTrace_Final_Project_Documentation.docx`: Foundational project documentation.

## Building and Running

### Prerequisites
- Node.js and npm installed.
- MySQL server running locally.

### Setup
1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Environment Configuration:**
   Copy the `.env.example` files to `.env` in both `client/` and `server/` directories and configure your MySQL credentials in `server/.env`.
3. **Database Initialization:**
   ```bash
   mysql -u root -p < server/sql/schema.sql
   ```

### Development
- **Run both Apps (Concurrent):**
  ```bash
  npm run dev
  ```
- **Run Client Only:**
  ```bash
  npm run dev:client
  ```
- **Run Server Only:**
  ```bash
  npm run dev:server
  ```

### Data Migration
- **Import Demo JSON Data:**
  If you have existing JSON data to migrate into MySQL:
  ```bash
  npm run db:import-json --workspace server
  ```

### Testing
- **Run Backend Tests:**
  ```bash
  npm run test --workspace server
  ```

## Development Conventions

- **API Design:** Follows RESTful principles. Endpoints are located under `/api/`.
- **Authentication:** Protected routes require a valid JWT in the `Authorization` header.
- **Database Access:** Centralized in `server/src/store.js`.
- **Styling:** Uses a unified `styles.css` in the client with a CSS variable-based theme system (supporting light and dark modes).
- **Date Handling:** Months are handled in `YYYY-MM` format; dates in `YYYY-MM-DD`.
