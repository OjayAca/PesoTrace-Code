const net = require("node:net");
const { spawn } = require("node:child_process");

const DEFAULT_API_PORT = Number(process.env.PORT || 5000);
const CLIENT_PORT = Number(process.env.CLIENT_PORT || 5173);
const npmExecPath = process.env.npm_execpath;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = new Set();

function isPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort) {
  let port = startPort;

  while (!(await isPortAvailable(port))) {
    port += 1;
  }

  return port;
}

function startWorkspace(name, workspace, envOverrides) {
  const command = npmExecPath || npmCommand;
  const args = npmExecPath
    ? [npmExecPath, "run", "dev", "--workspace", workspace]
    : ["run", "dev", "--workspace", workspace];
  const child = spawn(npmExecPath ? process.execPath : command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...envOverrides,
    },
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${name}.`, error);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    if (signal) {
      console.error(`${name} stopped with signal ${signal}.`);
    } else if (code !== 0) {
      console.error(`${name} exited with code ${code}.`);
    }

    shutdown(code ?? 1);
  });

  children.add(child);
  return child;
}

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    child.kill("SIGTERM");
  }

  process.exitCode = exitCode;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  const apiPort = await findAvailablePort(DEFAULT_API_PORT);
  const apiUrl = `http://localhost:${apiPort}/api`;
  const clientOrigin = `http://localhost:${CLIENT_PORT}`;

  if (apiPort !== DEFAULT_API_PORT) {
    console.log(
      `Port ${DEFAULT_API_PORT} is unavailable. Starting the API on ${apiPort} instead.`,
    );
  }

  console.log(`Client: ${clientOrigin}`);
  console.log(`API: ${apiUrl}`);

  startWorkspace("server", "server", {
    PORT: String(apiPort),
    CLIENT_ORIGIN: clientOrigin,
  });
  startWorkspace("client", "client", {
    VITE_API_URL: apiUrl,
  });
}

main().catch((error) => {
  console.error("Failed to start the development servers.", error);
  process.exit(1);
});
