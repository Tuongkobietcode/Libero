# Libero — Hướng dẫn chạy local

Tổng quan stack:

- **MongoDB 7** (replica set `rs0`) — bắt buộc, code có dùng transaction.
- **Redis 7** — BullMQ queue + rate limit.
- **Server** Node.js (Express, port `5000`).
- **Reader** Vite React (port `5173`).
- **Admin** Vite React (port `5174`).

> Yêu cầu: Node.js ≥ 20, npm ≥ 10, Docker Desktop đang chạy.

---

## 1. Khởi tạo hạ tầng (chạy 1 lần)

> **Trước mọi lệnh `docker`**: mở **Docker Desktop** và đợi icon khay hệ thống báo "Engine running". Kiểm tra nhanh: `docker info` không lỗi.

### 1.1 Bật MongoDB (replica set) + Redis bằng Docker

Mở **PowerShell**:

```powershell
# Mongo 7 với replica set rs0
docker run -d --name libero-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all

# Khởi tạo replica set (chạy 1 lần duy nhất sau khi container start)
docker exec -it libero-mongo mongosh --quiet --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"

# Redis 7
docker run -d --name libero-redis -p 6379:6379 redis:7
```

Kiểm tra:

```powershell
docker ps --filter "name=libero-"
docker exec -it libero-mongo mongosh --quiet --eval "rs.status().myState"   # phải in 1 (PRIMARY)
docker exec -it libero-redis redis-cli ping                                  # phải in PONG
```

> Sau này chỉ cần `docker start libero-mongo libero-redis` mỗi lần bật máy. Dừng bằng `docker stop libero-mongo libero-redis`.

### 1.2 Tạo file `.env` cho server

```powershell
cd "C:\Users\Nguyen Tuong\Libero\server"
Copy-Item .env.example .env
```

Mở [server/.env](server/.env) đổi `JWT_SECRET` thành chuỗi ngẫu nhiên ≥ 32 ký tự. Các giá trị khác giữ nguyên cho dev.

### 1.3 Cài dependencies (workspace gốc)

```powershell
cd "C:\Users\Nguyen Tuong\Libero"
npm install
```

### 1.4 Seed dữ liệu mẫu (sách, member admin/librarian, policy, fine rate)

```powershell
cd "C:\Users\Nguyen Tuong\Libero\server"
npm run seed
```

---

## 2. Chạy hằng ngày — 3 terminal

Mở **3 cửa sổ PowerShell**, mỗi cửa sổ chạy 1 lệnh:

### Terminal 1 — Server (port 5000)

```powershell
cd "C:\Users\Nguyen Tuong\Libero"
npm run dev
```

API sẵn sàng tại `http://localhost:5000/api`.

### Terminal 2 — Reader (port 5173)

```powershell
cd "C:\Users\Nguyen Tuong\Libero"
npm run dev:reader
```

Mở `http://localhost:5173` → bị redirect `/login` (auth bắt buộc).

### Terminal 3 — Admin (port 5174)

```powershell
cd "C:\Users\Nguyen Tuong\Libero"
npm run dev:admin
```

Mở `http://localhost:5174/admin/` (admin app dùng `base: '/admin/'`).

> Cả reader (5173) và admin (5174) đã cố định port + `strictPort: true` trong vite.config.ts. Nếu port bị chiếm Vite sẽ **báo lỗi ngay** thay vì nhảy port khác (tránh CORS lệch). Khi đó kill process cũ:
>
> ```powershell
> Get-NetTCPConnection -LocalPort 5173,5174 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
> ```

---

## 3. Lệnh phụ trợ

### Type check

```powershell
npm run typecheck            # server
npm run typecheck:reader     # reader
npm run typecheck:admin      # admin
```

### Test

```powershell
npm test                     # server (jest)
npm run test:reader          # reader (vitest)
npm run test:admin           # admin (vitest)
```

### Build production

```powershell
npm run build                # server -> dist/
npm run build:reader         # reader -> client/reader/dist
npm run build:admin          # admin  -> client/admin/dist
```

### Mongo shell (debug)

```powershell
docker exec -it libero-mongo mongosh "mongodb://localhost:27017/libero?replicaSet=rs0"
```

Trong shell:

```js
show collections
db.books.countDocuments()
db.members.find({ role: { $in: ["admin","librarian"] } }, { email:1, role:1 })
```

---

## 4. Tài khoản mặc định sau khi seed

Mọi tài khoản demo đều có status `active`, kỳ hạn 365 ngày kể từ `2026-01-01`.

| Vai trò  | Email                     | Mật khẩu    | Ghi chú                                             |
| --------- | ------------------------- | ------------- | ---------------------------------------------------- |
| Admin     | `admin@library.edu`     | `Admin123!` | Quản trị toàn hệ thống (sửa policy, fine rate) |
| Librarian | `librarian@library.edu` | `Passw0rd!` | Vận hành: cho mượn/trả, quản lý sách, member |
| Lecturer  | `lecturer@library.edu`  | `Passw0rd!` | Mượn tối đa 5 cuốn / 30 ngày                   |
| Student A | `student1@library.edu`  | `Passw0rd!` | Mã SV `SV2026001`, CNTT-K20                       |
| Student B | `student2@library.edu`  | `Passw0rd!` | Mã SV `SV2026002`, KT-K20                         |

Catalog mẫu: 8 category, 10 author, 12 đầu sách (Clean Code, Refactoring, AI Modern Approach, Sapiens, Mắt biếc, Dế Mèn…) với tổng ~47 bản copy, tất cả ở trạng thái `available`.

Ngoài ra có sẵn:

- 3 `LoanPolicy` (Student/Lecturer/Librarian).
- 1 `FineRate` 5.000đ/ngày quá hạn, áp dụng từ `2026-01-01`.

Login admin app (`http://localhost:5174`) bằng admin/librarian để cho member mượn sách. Đăng ký tài khoản mới ở reader (`/register`) sẽ tạo Student với hồ sơ trắng.

---

## 5. Sự cố thường gặp

| Triệu chứng                                            | Nguyên nhân                                | Cách xử lý                                                                     |
| -------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Server log `MongoDB connection error: ... not primary` | Replica set chưa init                       | Chạy lại lệnh `rs.initiate(...)` ở mục 1.1                                 |
| `ECONNREFUSED 127.0.0.1:27017`                         | Container Mongo chưa chạy                  | `docker start libero-mongo`                                                     |
| `ECONNREFUSED 127.0.0.1:6379`                          | Container Redis chưa chạy                  | `docker start libero-redis`                                                     |
| Reader/Admin gọi API bị CORS                           | App đang chạy ở port khác `5173/5174`  | Sửa `CORS_ORIGINS` trong [server/.env](server/.env) hoặc dùng `--port` đúng |
| Login reader xong vẫn loop về `/login`               | Cookie bị chặn (HTTPS/SameSite)            | Dùng `http://localhost`, không dùng `127.0.0.1`                            |
| Port 5000 bị chiếm                                     | Đổi `PORT` trong [server/.env](server/.env) |                                                                                   |

---

## 6. Dọn dẹp

```powershell
# Dừng và xoá container (mất dữ liệu Mongo)
docker rm -f libero-mongo libero-redis

# Dừng dev server: Ctrl+C ở mỗi terminal
```
