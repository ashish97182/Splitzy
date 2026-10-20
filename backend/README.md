# Splitzy Backend

## Requirements and local setup

- Node.js `>=20.13.0`
- PostgreSQL supported by Prisma

From this directory:

```sh
cp .env.example .env
# Edit DATABASE_URL and generate distinct random JWT secrets (32+ characters).
npm ci
npx prisma generate
npx prisma migrate dev
npm run dev
```

Generate secrets locally, for example with `openssl rand -base64 48`. The
placeholders in `.env.example` are intentionally rejected by runtime validation.
Never commit `.env` or real credentials.

## Environment variables

| Variable | Requirement | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Required | PostgreSQL connection URL. |
| `JWT_SECRET` | Required; unique, non-placeholder, 32+ characters | Access-token signing key. |
| `JWT_REFRESH_SECRET` | Required; distinct from `JWT_SECRET`, non-placeholder, 32+ characters | Refresh-token signing key. |
| `PORT` | Optional; defaults to `5000` | HTTP listener port. |
| `NODE_ENV` | Optional | Runtime mode; production enables secure cookies and production request logging. |
| `CLIENT_URL` | Optional | Primary exact CORS/browser origin. |
| `CLIENT_ORIGINS` | Optional | Additional comma-separated exact origins. |
| `COOKIE_SAME_SITE` | Optional; defaults to `strict` | Cookie policy: `strict`, `lax`, or `none`. `none` always enables `Secure` and requires HTTPS in deployment. |
| `TRUST_PROXY` | Optional | Exact trusted proxy hop count from 0 to 10; leave unset when directly exposed. |
| `EMAIL_USER`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_REFRESH_TOKEN` | Optional; configure all four | Gmail OAuth2 email delivery. Leave blank to disable email. |
| `TEST_DATABASE_URL` | Required for integration tests | Isolated PostgreSQL database/schema whose name includes `test`; tests refuse other names and clean up only their uniquely created rows. |

## Runtime commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Starts `server.js` with Node watch mode. |
| `npm run build` | Compiles the JavaScript module tree into `dist/`. |
| `npm start` | Starts the compiled production entry point, `dist/server.js`. |
| `npx prisma generate` | Generates the Prisma client from the current schema. |
| `npx prisma migrate dev` | Applies development migrations. |
| `npx prisma migrate deploy` | Applies committed migrations in deployment. |
| `npm test` | Runs isolated unit tests with Node’s built-in test runner. |
| `npm run test:integration` | Runs PostgreSQL-backed HTTP/DB regression coverage; requires `TEST_DATABASE_URL`. |
| `npm run test:ci` | Runs unit and integration suites. |

The production path is: clean locked install, Prisma client generation, migration
deployment, `npm run build`, and `npm start`. The application validates database
configuration before connecting and does not open its listener if database
startup fails. `SIGTERM` and `SIGINT` close the HTTP server and Prisma connection.

## Health, logging, and security

- `GET /api/health` is liveness only and does not imply that the database is ready.
- `GET /api/ready` performs a database query bounded to two seconds and reports
  only database readiness and whether email is configured.
- Helmet, an exact-origin credentialed CORS allowlist, state-changing request
  origin checks, a 100 KiB JSON limit, strict Zod validation, and auth throttling
  are enabled in the app.
- Request logs include request metadata, not JSON bodies, cookies, or auth headers.
  Application errors return generic client responses; server logs retain diagnostic
  error details and must be access-controlled.
- Refresh cookies are HTTP-only and scoped to `/api/auth`. `SameSite=Strict` is
  the default. Cross-site browser deployments must use HTTPS and `SameSite=None`;
  the origin allowlist must exactly include the deployed frontend.

## Deployment, backups, and recovery

Deploy code and additive migrations in a backward-compatible order. Use the
deployment identity’s secret store for database/JWT/email credentials; do not
pass secrets on command lines or commit them. Verify `/api/ready` after migration
and deployment.

Establish encrypted, access-controlled PostgreSQL backups and point-in-time
recovery according to the service’s recovery objectives. Before a migration,
take or verify a restorable backup. Exercise restoration in a separate database
at least quarterly and record the measured recovery time. Keep rollback plans
for the application release; database migrations are forward-only, so rollback
must use a compatible previous app version or a separately tested restore rather
than rewriting migration history.

Alert on sustained readiness failures, elevated HTTP 5xx/429 rates, database
connection errors, and failed background email sends. Rotate JWT signing keys
through a coordinated deployment: changing either key invalidates sessions
signed by the previous value. Rotate Gmail OAuth credentials in the secret store
and confirm email readiness after deployment.
