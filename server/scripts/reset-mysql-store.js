import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { importJsonStore } from "./import-json-store.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.resolve(__dirname, "../sql/schema.sql");
const bundledJsonPath = path.resolve(__dirname, "../data/db.json");
const defaultDatabaseName = "pesotrace";

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function getDatabaseName(env = process.env) {
  if (env.MYSQL_DATABASE && String(env.MYSQL_DATABASE).trim()) {
    return String(env.MYSQL_DATABASE).trim();
  }

  if (env.MYSQL_URL || env.DATABASE_URL) {
    const url = new URL(env.MYSQL_URL || env.DATABASE_URL);
    const database = url.pathname.replace(/^\//, "").trim();
    return database || defaultDatabaseName;
  }

  return defaultDatabaseName;
}

function getConnectionConfig(env = process.env, databaseName) {
  if (env.MYSQL_URL || env.DATABASE_URL) {
    const url = new URL(env.MYSQL_URL || env.DATABASE_URL);
    const config = {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username || ""),
      password: decodeURIComponent(url.password || ""),
      multipleStatements: true,
    };

    if (databaseName) {
      config.database = databaseName;
    }

    return config;
  }

  const host = env.MYSQL_HOST || "127.0.0.1";
  const port = Number(env.MYSQL_PORT || 3306);
  const user = env.MYSQL_USER || "root";
  const password = env.MYSQL_PASSWORD || "";

  return {
    host,
    port,
    user,
    password,
    multipleStatements: true,
    ...(databaseName ? { database: databaseName } : {}),
  };
}

function rewriteSchemaDatabase(schemaSql, databaseName) {
  const quotedDatabase = escapeIdentifier(databaseName);

  return schemaSql
    .replace(
      /CREATE DATABASE IF NOT EXISTS pesotrace/i,
      `CREATE DATABASE IF NOT EXISTS ${quotedDatabase}`,
    )
    .replace(/USE pesotrace;/i, `USE ${quotedDatabase};`);
}

function rewriteDatabaseUrl(urlString, databaseName) {
  if (!urlString) {
    return urlString;
  }

  const url = new URL(urlString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function readSchema() {
  return fs.readFile(schemaPath, "utf8");
}

async function recreateDatabase(env = process.env) {
  const databaseName = getDatabaseName(env);
  const adminConnection = await mysql.createConnection(getConnectionConfig(env, undefined));

  try {
    await adminConnection.query(`DROP DATABASE IF EXISTS ${escapeIdentifier(databaseName)}`);
    await adminConnection.query(
      `CREATE DATABASE ${escapeIdentifier(databaseName)} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci`,
    );

    const schemaSql = await readSchema();
    const rewrittenSchema = rewriteSchemaDatabase(schemaSql, databaseName);
    await adminConnection.query(rewrittenSchema);
  } finally {
    await adminConnection.end();
  }

  return databaseName;
}

async function main() {
  const databaseName = await recreateDatabase(process.env);
  const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL || "";
  const importedCounts = await importJsonStore({
    inputPath: bundledJsonPath,
    env: {
      ...process.env,
      MYSQL_DATABASE: databaseName,
      MYSQL_URL: process.env.MYSQL_URL ? rewriteDatabaseUrl(mysqlUrl, databaseName) : undefined,
      DATABASE_URL: process.env.DATABASE_URL
        ? rewriteDatabaseUrl(process.env.DATABASE_URL, databaseName)
        : undefined,
    },
  });

  console.log(
    `Recreated MySQL database "${databaseName}" from ${schemaPath} and imported ${JSON.stringify(
      importedCounts,
    )}.`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error("Failed to recreate the MySQL database.", error);
    process.exit(1);
  });
}
