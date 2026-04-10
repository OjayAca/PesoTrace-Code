import dotenv from "dotenv";
import { db, initStore, persist } from "./store.js";
import { createApp } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const app = createApp({
  store: db,
  persistStore: persist,
  clientOrigin: CLIENT_ORIGIN,
});

export async function startServer() {
  await initStore();

  return app.listen(PORT, () => {
    console.log(`PesoTrace API listening on http://localhost:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("Failed to initialize data store.", error);
    process.exit(1);
  });
}

export { app };
