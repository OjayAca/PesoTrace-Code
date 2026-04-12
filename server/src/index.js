import dotenv from "dotenv";
import { createStoreFromEnv } from "./store.js";
import { createApp } from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const store = createStoreFromEnv(process.env);
const app = createApp({
  store,
  clientOrigin: CLIENT_ORIGIN,
});

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port);

    const handleError = (error) => {
      reject(error);
    };

    server.once("error", handleError);
    server.once("listening", () => {
      server.off("error", handleError);
      console.log(`PesoTrace API listening on http://localhost:${port}`);
      resolve(server);
    });
  });
}

export async function startServer() {
  await store.init();
  return listen(PORT);
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Set PORT to another value or run "npm run dev" from the project root to auto-select a free API port.`,
      );
      process.exit(1);
    }

    console.error("Failed to initialize data store.", error);
    process.exit(1);
  });
}

export { app };
