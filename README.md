# LIBERO

LIBERO is a library management system built with Node.js, Express, MongoDB, Redis, BullMQ, Socket.IO, React, Vite, TypeScript, Tailwind, and Ant Design.

Repository layout:

- `server`: backend API
- `client/admin`: admin and librarian UI
- `client/reader`: reader UI
- `shared`: shared models, enums, and types

## Prerequisites

- Node.js `>= 20`
- npm
- Docker Desktop
- PowerShell on Windows

## Local Ports

| Service | URL |
| --- | --- |
| Backend API | `http://localhost:5000/api/v1` |
| Reader UI | `http://localhost:5173/` |
| Admin UI | `http://localhost:5174/admin/` |
| MongoDB | `localhost:27017` |
| Redis | `localhost:6379` |

The admin Vite app uses `base: /admin/`, so open `http://localhost:5174/admin/`, not just `http://localhost:5174/`.

## First-Time Setup on a New Machine

### 1. Clone and install dependencies

```powershell
git clone <your-repo-url>
cd Libero
npm install
```

### 2. Create the backend env file

The backend reads `server/.env` first, then root `.env`. For local setup, use the root `.env`:

```powershell
Copy-Item .env.example .env
```

Expected local values:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/libero?replicaSet=rs0
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace-with-a-32-character-secret
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=604800
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=replace-me
SMTP_PASS=replace-me
FINE_BLOCK_THRESHOLD=50000
HOLD_EXPIRY_HOURS=48
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Important:

- `MONGODB_URI` must include `replicaSet=rs0`. Some flows use MongoDB transactions.
- `CORS_ORIGINS` must include both reader and admin origins.
- `JWT_SECRET` must be at least 32 characters.

Frontend env files are already committed for local development:

- `client/admin/.env.development`
- `client/reader/.env.development`

Both point to:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 3. Create Docker network and volumes

Run this once on a new machine:

```powershell
docker network create libero-net
docker volume create libero-mongo-data
docker volume create libero-redis-data
```

If Docker says a network or volume already exists, that is fine.

### 4. Create MongoDB and Redis containers

Run MongoDB as a replica set:

```powershell
docker run -d --name libero-mongo `
  --network libero-net `
  -p 27017:27017 `
  -v libero-mongo-data:/data/db `
  mongo:7 --replSet rs0 --bind_ip_all
```

Run Redis:

```powershell
docker run -d --name libero-redis `
  --network libero-net `
  -p 6379:6379 `
  -v libero-redis-data:/data `
  redis:7 redis-server --appendonly yes
```

Initialize the MongoDB replica set:

```powershell
docker exec libero-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Verify both services:

```powershell
docker ps
docker exec libero-redis redis-cli ping
docker exec libero-mongo mongosh --eval "rs.status().ok"
```

Expected:

- Redis returns `PONG`
- Mongo returns `1`

### 5. Seed base data

Run the normal seed:

```powershell
npm run seed
```

This creates or updates base data: policies, fine rates, admin account, demo members, categories, authors, books, and copies.

Current behavior:

- `npm run seed` is the safe base seed. It does not reset operational demo data such as loans, reservations, book holds, fines, notifications, audit logs, or refresh tokens.
- `npm run seed:reset-demo` is destructive demo reset. Use it only when you intentionally want to clear and recreate demo operational scenarios.

## Running the Project

Use three terminals.

### Terminal 1: Docker and backend

```powershell
cd <path-to-Libero>
docker start libero-mongo libero-redis
npm run dev
```

Health check:

```powershell
curl http://localhost:5000/api/v1/health
```

### Terminal 2: reader UI

```powershell
cd <path-to-Libero>
npm run dev:reader
```

Open:

```text
http://localhost:5173/
```

### Terminal 3: admin UI

```powershell
cd <path-to-Libero>
npm run dev:admin
```

Open:

```text
http://localhost:5174/admin/
```

Both Vite apps use `strictPort: true`. If a port is already in use, stop the old process or change the port in the related `vite.config.ts`.

## Login Accounts After Seed

Admin:

- Email: `admin@library.edu`
- Password: `Admin123!`

Librarian:

- Email: `librarian1@library.edu`
- Password: `Passw0rd!`

Reader examples:

- Email: `student001@library.edu`
- Password: `Passw0rd!`
- Email: `lecturer1@library.edu`
- Password: `Passw0rd!`

Admin and librarian accounts are for the admin UI. Student and lecturer accounts are for the reader UI.

## Demo Data Workflow

Use this rule when testing:

- First setup or missing base data: run `npm run seed`.
- Normal daily work: start Docker and run the apps. Do not seed again unless needed.
- Need a clean scripted demo: run `npm run seed:reset-demo`.

`seed:reset-demo` clears operational demo data:

- loans
- reservations
- book holds
- fines
- notifications
- audit logs
- refresh tokens

Because refresh tokens are cleared, any logged-in browser sessions will be invalidated.

## Registering a New Reader

Public registration creates an active student account. After registering in the reader UI, the user can log in immediately.

For admin-created accounts:

1. Log in to the admin UI.
2. Go to Members.
3. Create a member with role `student` or `lecturer`.
4. Use that account in the reader UI.

## Useful Commands

Root shortcuts:

```powershell
npm run dev
npm run dev:admin
npm run dev:reader
npm run seed
npm run seed:reset-demo
npm run build
npm run build:admin
npm run build:reader
npm run typecheck
npm run typecheck:admin
npm run typecheck:reader
npm run test
npm run test:admin
npm run test:reader
```

Backend only:

```powershell
npm run dev --workspace server
npm run seed --workspace server
npm run seed:reset-demo --workspace server
npm run test --workspace server
npm run typecheck --workspace server
npm run build --workspace server
```

Admin only:

```powershell
npm run dev --workspace @libero/admin
npm run test:run --workspace @libero/admin
npm run typecheck --workspace @libero/admin
npm run build --workspace @libero/admin
```

Reader only:

```powershell
npm run dev --workspace @libero/reader
npm run test:run --workspace @libero/reader
npm run typecheck --workspace @libero/reader
npm run build --workspace @libero/reader
```

## Full First-Time Command Sequence

```powershell
git clone <your-repo-url>
cd Libero
npm install
Copy-Item .env.example .env
docker network create libero-net
docker volume create libero-mongo-data
docker volume create libero-redis-data
docker run -d --name libero-mongo --network libero-net -p 27017:27017 -v libero-mongo-data:/data/db mongo:7 --replSet rs0 --bind_ip_all
docker run -d --name libero-redis --network libero-net -p 6379:6379 -v libero-redis-data:/data redis:7 redis-server --appendonly yes
docker exec libero-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
npm run seed
```

Then start the apps in separate terminals:

```powershell
npm run dev
```

```powershell
npm run dev:reader
```

```powershell
npm run dev:admin
```

## Troubleshooting

### Admin or reader shows Network Error

Most common cause: backend is not listening on port `5000`.

Check:

```powershell
docker ps
curl http://localhost:5000/api/v1/health
```

Fix:

```powershell
docker start libero-mongo libero-redis
npm run dev
```

### `POST http://localhost:5000/api/v1/auth/login net::ERR_CONNECTION_REFUSED`

The frontend is running, but the backend is down or failed to start. Start the backend with:

```powershell
npm run dev
```

### Mongo transaction error

If you see:

```text
Transaction numbers are only allowed on a replica set member or mongos
```

Use:

```env
MONGODB_URI=mongodb://localhost:27017/libero?replicaSet=rs0
```

Then make sure the Docker Mongo container was started with `--replSet rs0` and initialized:

```powershell
docker exec libero-mongo mongosh --eval "rs.status().ok"
```

### Docker container name already exists

If `docker run` says the container name is already in use, start the existing containers:

```powershell
docker start libero-mongo libero-redis
```

Only recreate containers if you intentionally want to replace them:

```powershell
docker rm -f libero-mongo libero-redis
```

Then run the `docker run` commands again.

### Mongo replica set was already initialized

If `rs.initiate(...)` says the replica set already exists, ignore it and verify:

```powershell
docker exec libero-mongo mongosh --eval "rs.status().ok"
```

### Invalid email or password after changing demo data

Run the normal seed first:

```powershell
npm run seed
```

If you intentionally want to reset demo account state and passwords, run:

```powershell
npm run seed:reset-demo
```

Then log in again with the default credentials above.

### Admin URL opens a blank or wrong page

Use:

```text
http://localhost:5174/admin/
```

The admin app has Vite base `/admin/`.

### VS Code cannot load the tsconfig schema

This warning is usually an internet/DNS issue when VS Code tries to reach SchemaStore. It does not block the project from running.

### Build warning: chunk larger than 500 kB

Vite may warn that a generated chunk is larger than 500 kB. This is a bundle-size warning, not a compile failure.
