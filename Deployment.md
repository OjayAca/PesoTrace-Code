# Deploy PesoTrace API on Railway

This checklist deploys only `server/` as the Express API on Railway with a Railway MySQL database. The React frontend should still be deployed separately, for example on Vercel.

## 1. Create the Railway project

1. Go to `https://railway.app`.
2. Sign in with GitHub.
3. Create a new project from the GitHub repo:

   ```text
   OjayAca/PesoTrace-Code
   ```

4. Select the repo service and configure it as the backend API.

## 2. Configure the API service

In the Railway API service settings, set:

```text
Root Directory: server
Start Command: npm start
```

Leave the build command on Railway's default or auto setting unless Railway asks for a value. The server package already defines:

```json
"start": "node src/index.js"
```

Do not set `PORT`; Railway injects it automatically and the app reads `process.env.PORT`.

## 3. Add Railway MySQL

1. In the same Railway project, click `+ New`.
2. Choose `Database`.
3. Select `MySQL`.
4. Wait for the MySQL service to finish deploying.

Railway MySQL exposes variables such as:

```text
MYSQLHOST
MYSQLPORT
MYSQLUSER
MYSQLPASSWORD
MYSQLDATABASE
MYSQL_URL
```

## 4. Add API variables

Open the API service variables and add:

```text
NODE_ENV=production
MYSQL_STORE=true

MYSQL_HOST=${{ MySQL.MYSQLHOST }}
MYSQL_PORT=${{ MySQL.MYSQLPORT }}
MYSQL_USER=${{ MySQL.MYSQLUSER }}
MYSQL_PASSWORD=${{ MySQL.MYSQLPASSWORD }}
MYSQL_DATABASE=pesotrace

JWT_SECRET=<random-32-plus-character-secret>

EMAIL_PROVIDER=resend
EMAIL_FROM=PesoTrace <no-reply@your-domain.com>
RESEND_API_KEY=<your-resend-api-key>

BCRYPT_ROUNDS=12

CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app
APP_BASE_URL=https://<your-vercel-app>.vercel.app
```

Use a real high-entropy value for `JWT_SECRET`. Do not use the sample value from `server/.env.example`.

If the Vercel frontend URL is not ready yet, temporarily use:

```text
CLIENT_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:5173
```

Replace both with the final frontend origin after the frontend is deployed.

If the database service is not named `MySQL`, adjust the variable references to match the exact Railway service name, for example:

```text
${{ YourServiceName.MYSQLHOST }}
```

## 5. Generate the public API domain

1. Open the API service.
2. Go to `Settings`.
3. Find `Networking`.
4. Generate a public domain.
5. Copy the Railway API URL.

The API base URL will be:

```text
https://<your-railway-api-domain>/api
```

## 6. Initialize the MySQL schema

The app needs `server/sql/schema.sql` loaded into Railway MySQL before real use. The schema creates and uses the `pesotrace` database, so keep:

```text
MYSQL_DATABASE=pesotrace
```

Recommended local CLI flow:

```bash
railway login
railway link
railway connect
```

When the MySQL prompt opens, run the contents of:

```text
server/sql/schema.sql
```

`railway connect` requires the MySQL client to be installed locally.

## 7. Redeploy the API

After variables and schema are ready:

1. Open the API service.
2. Go to `Deployments`.
3. Click `Redeploy`.

Watch logs for startup errors. A successful deployment should start the API without MySQL, JWT, or email configuration errors.

## 8. Test the Railway API

Run:

```bash
curl https://<your-railway-api-domain>/api/health
```

Expected response:

```json
{"status":"ok"}
```

Use `https://`; production HTTP requests redirect to HTTPS.

## 9. Connect the frontend later

When deploying the Vercel frontend, set:

```text
VITE_API_URL=https://<your-railway-api-domain>/api
```

After Vercel gives the final URL, update Railway API variables:

```text
CLIENT_ORIGIN=https://<your-final-vercel-domain>
APP_BASE_URL=https://<your-final-vercel-domain>
```

Then redeploy the Railway API.

## Troubleshooting

- If Railway deploy fails with missing MySQL config, confirm the API service variables reference the exact MySQL service name.
- If register or login fails from the frontend, check that `CLIENT_ORIGIN` exactly matches the frontend origin, including `https://` and no trailing slash.
- If password reset fails in production, check `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, and `APP_BASE_URL`.
- If the app starts but database routes fail, confirm `server/sql/schema.sql` was run against Railway MySQL.
- If `railway link` is used locally, the generated `.railway/` directory is ignored by git.

## References

- Railway monorepo root directory and build settings: `https://docs.railway.com/builds/build-configuration`
- Railway start command behavior: `https://docs.railway.com/builds/build-and-start-commands`
- Railway MySQL variables: `https://docs.railway.com/guides/mysql`
- Railway database shell: `https://docs.railway.com/cli/connect`
