# LIBERO

LIBERO is a library management system built with:

- MongoDB
- Mongoose
- Node.js
- Express
- React
- Vite
- TypeScript
- Redis
- BullMQ

This repository currently includes:

- `server`: backend API
- `client/admin`: admin frontend
- `client/reader`: reader frontend

## Prerequisites

- Node.js `>= 20`
- npm
- Docker Desktop
- PowerShell on Windows

## Quick Start

### 1. Clone and install dependencies

```powershell
git clone <your-repo-url>
cd libero
npm install
```

### 2. Create local env

Create the root env file if it does not exist yet:

```powershell
Copy-Item .env.example .env
```

Default local backend env:

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
```

Admin and reader frontends already point to the local backend through:

- `client/admin/.env.development`
- `client/reader/.env.development`

Both use:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Run MongoDB and Redis with Docker

### First time only

Create Docker network and volumes:

```powershell
docker network create libero-net
docker volume create libero-mongo-data
docker volume create libero-redis-data
```

Run MongoDB:

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

Initialize MongoDB replica set:

```powershell
docker exec libero-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Verify services:

```powershell
docker ps
docker exec libero-redis redis-cli ping
docker exec libero-mongo mongosh --eval "rs.status().ok"
```

Expected results:

- Redis returns `PONG`
- Mongo returns `1`

### Next runs

If containers already exist, do not run `docker run` again. Start them with:

```powershell
docker start libero-mongo libero-redis
```

## Seed default data

Seed loan policies, fine rate, and the default admin account:

```powershell
cd c:\Users\ADMIN\libero
npm run seed --workspace @libero/server
```

Default admin credentials:

- Email: `admin@library.edu`
- Password: `Admin123!`

## Run the project locally

Use this order for a normal local session.

### Terminal 1: backend API

```powershell
cd c:\Users\ADMIN\libero
docker start libero-mongo libero-redis
npm run dev
```

Health check:

```powershell
curl http://localhost:5000/api/v1/health
```

### Terminal 2: admin frontend

```powershell
cd c:\Users\ADMIN\libero
npm run dev:admin
```

Open:

```text
http://localhost:5173/admin/
```

### Terminal 3: reader frontend

```powershell
cd c:\Users\ADMIN\libero
npm run dev:reader
```

Open:

```text
http://localhost:5173/
```

If the admin app is already using `5173`, Vite will usually move the reader app to the next free port, typically `5174`. Use the exact URL shown in the terminal.

## Full first-time run example

If someone pulls the code for the first time, these are the full commands to run in order:

```powershell
git clone <your-repo-url>
cd libero
npm install
Copy-Item .env.example .env
docker network create libero-net
docker volume create libero-mongo-data
docker volume create libero-redis-data
docker run -d --name libero-mongo --network libero-net -p 27017:27017 -v libero-mongo-data:/data/db mongo:7 --replSet rs0 --bind_ip_all
docker run -d --name libero-redis --network libero-net -p 6379:6379 -v libero-redis-data:/data redis:7 redis-server --appendonly yes
docker exec libero-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
npm run seed --workspace @libero/server
```

Then start the apps in separate terminals:

```powershell
cd c:\Users\ADMIN\libero
npm run dev
```

```powershell
cd c:\Users\ADMIN\libero
npm run dev:admin
```

```powershell
cd c:\Users\ADMIN\libero
npm run dev:reader
```

## How to test admin and reader flows

### Admin

1. Run seed.
2. Open `http://localhost:5173/admin/`
3. Login with:
   - Email: `admin@library.edu`
   - Password: `Admin123!`

### Reader

There is no default reader account in seed. Use one of these flows:

Flow A:
1. Open the reader app.
2. Register a new account from `/register`.
3. Login to admin UI with the default admin account.
4. Go to Members and activate the new reader account.
5. Login again on the reader app.

Flow B:
1. Login to admin UI.
2. Create a member with role `student` or `lecturer`.
3. Ensure the member status is `active`.
4. Login to the reader app with that member account.

Notes:

- Reader frontend is intended for `student` and `lecturer`.
- Admin and librarian accounts are not meant to use the reader area.
- Reservation creation is only allowed for `student` and `lecturer`.

## Useful commands

### Root shortcuts

```powershell
npm run dev
npm run dev:admin
npm run dev:reader
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

### Backend only

```powershell
npm run dev --workspace @libero/server
npm run seed --workspace @libero/server
npm run test --workspace @libero/server
npm run typecheck --workspace @libero/server
npm run build --workspace @libero/server
```

### Admin frontend only

```powershell
npm run dev --workspace @libero/admin
npm run test:run --workspace @libero/admin
npm run typecheck --workspace @libero/admin
npm run build --workspace @libero/admin
```

### Reader frontend only

```powershell
npm run dev --workspace @libero/reader
npm run test:run --workspace @libero/reader
npm run typecheck --workspace @libero/reader
npm run build --workspace @libero/reader
```

## Troubleshooting

### Docker container name already exists

If `docker run` says container name is already in use:

```powershell
docker start libero-mongo libero-redis
```

If you want to recreate them:

```powershell
docker rm -f libero-mongo libero-redis
```

Then run the `docker run` commands again.

### Mongo container exists but is not running

Check logs:

```powershell
docker logs libero-mongo --tail 100
```

### Mongo replica set was already initialized

If `rs.initiate(...)` says the replica set already exists, ignore it. Verify with:

```powershell
docker exec libero-mongo mongosh --eval "rs.status().ok"
```

### Admin or reader UI returns `404` for `/api/v1/...` on the frontend port

Make sure the frontend is using:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Then restart the related dev server:

```powershell
npm run dev:admin
```

or

```powershell
npm run dev:reader
```

### Seed ran successfully but admin login still fails

Run seed again to reset the default admin password:

```powershell
npm run seed --workspace @libero/server
```

Then login with:

- Email: `admin@library.edu`
- Password: `Admin123!`

### Reader account login fails right after register

That is expected if the account is still pending approval.

Use admin UI to activate the member account first, then login again.

### Vite frontend port is different from the README

When multiple Vite apps run at the same time, the second app may move to another port automatically.

Examples:

- Admin: `http://localhost:5173/admin/`
- Reader: `http://localhost:5174/`

Always check the exact URL printed in the terminal after `npm run dev:admin` or `npm run dev:reader`.
