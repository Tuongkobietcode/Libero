# SETUP.md

## 1. Tổng quan

File này hướng dẫn cài đặt và chạy dự án LIBERO trên một máy local mới từ đầu.

LIBERO là hệ thống quản lý thư viện gồm:

- Backend API: `server`
- Giao diện quản trị/thủ thư: `client/admin`
- Giao diện bạn đọc: `client/reader`
- Mã dùng chung cho enum, model và helper: `shared`

Dự án dùng Node.js workspace, Express, MongoDB, Redis, React, Vite, TypeScript và Tailwind CSS. Các bước bên dưới dành cho môi trường local development.

## 2. Điều kiện cần có trên máy local

### Hệ điều hành

- Khuyến nghị: Windows 10/11, macOS hoặc Linux.
- Trên Windows nên dùng PowerShell và Docker Desktop với WSL 2 backend.

### Công cụ bắt buộc

| Công cụ | Phiên bản khuyến nghị | Vai trò |
| --- | --- | --- |
| Git | Bản mới ổn định | Clone source code và quản lý version |
| Node.js | `>= 20` | Chạy backend, frontend và tooling TypeScript/Vite |
| npm | Đi kèm Node.js | Cài dependencies cho npm workspaces |
| Docker Desktop | Bản mới ổn định | Chạy MongoDB và Redis local |
| MongoDB container | `mongo:7` | Database chính, cần replica set `rs0` vì backend dùng transaction |
| Redis container | `redis:7` | Cache, rate limit, queue/BullMQ và realtime jobs |

Không cần cài MongoDB hoặc Redis trực tiếp trên Windows nếu dùng Docker. Nếu máy có Windows Service `MongoDB` chạy ở port `27017`, nên tắt service đó để tránh xung đột với Docker Mongo của dự án.

## 3. Các bước cài đặt dự án

### Bước 1: Clone source code

Mục đích: tải mã nguồn dự án về máy local.

```powershell
git clone <repo-url>
cd Libero
```

`<repo-url>` là URL repository của dự án. Sau lệnh này, thư mục hiện tại phải là thư mục gốc có `package.json`, `server`, `client` và `shared`.

### Bước 2: Cài dependencies npm workspace

Mục đích: cài toàn bộ thư viện cho backend, admin UI, reader UI và shared package.

```powershell
npm install
```

Lệnh này đọc `package-lock.json` và cài dependencies cho các workspace:

- `server`
- `shared`
- `client/admin`
- `client/reader`

### Bước 3: Tạo file cấu hình môi trường backend

Mục đích: cung cấp biến môi trường cho backend.

```powershell
Copy-Item .env.example .env
```

Backend đọc `server/.env` trước, sau đó đọc `.env` ở root nếu biến chưa tồn tại. Với local setup, dùng root `.env` là đủ.

Trên macOS/Linux, dùng:

```bash
cp .env.example .env
```

### Bước 4: Chuẩn bị Docker network và volume

Mục đích: tạo network và volume để MongoDB/Redis giữ dữ liệu qua các lần tắt máy.

```powershell
docker network create libero-net
docker volume create libero-mongo-data
docker volume create libero-redis-data
```

Nếu Docker báo network hoặc volume đã tồn tại, có thể bỏ qua.

### Bước 5: Tạo MongoDB container

Mục đích: chạy MongoDB 7 với replica set `rs0`.

```powershell
docker run -d --name libero-mongo `
  --network libero-net `
  -p 27017:27017 `
  -v libero-mongo-data:/data/db `
  mongo:7 --replSet rs0 --bind_ip_all
```

Giải thích:

- `--name libero-mongo`: đặt tên container để dễ start/stop.
- `-p 27017:27017`: expose MongoDB ra `localhost:27017`.
- `-v libero-mongo-data:/data/db`: lưu dữ liệu vào Docker volume.
- `--replSet rs0`: bật replica set, bắt buộc cho MongoDB transaction.

Khởi tạo replica set sau khi container chạy:

```powershell
docker exec libero-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Nếu lệnh báo replica set đã được khởi tạo trước đó, có thể bỏ qua và kiểm tra lại bằng lệnh ở phần dưới.

### Bước 6: Tạo Redis container

Mục đích: chạy Redis local cho backend.

```powershell
docker run -d --name libero-redis `
  --network libero-net `
  -p 6379:6379 `
  -v libero-redis-data:/data `
  redis:7 redis-server --appendonly yes
```

Giải thích:

- `--name libero-redis`: đặt tên container Redis.
- `-p 6379:6379`: expose Redis ra `localhost:6379`.
- `--appendonly yes`: bật append-only file để Redis có thể lưu dữ liệu bền hơn trong local dev.

### Bước 7: Kiểm tra MongoDB và Redis

Mục đích: xác nhận database services đã sẵn sàng trước khi seed/chạy server.

```powershell
docker ps --filter "name=libero-"
docker exec libero-mongo mongosh --quiet --eval "rs.status().myState"
docker exec libero-redis redis-cli ping
```

Dấu hiệu đúng:

- `libero-mongo` và `libero-redis` đang `Up`.
- MongoDB in ra `1`, nghĩa là node hiện tại là PRIMARY.
- Redis in ra `PONG`.

## 4. Cấu hình môi trường

### Backend `.env`

File `.env.example` hiện có nội dung mẫu:

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
OVERDUE_BLOCK_LOAN_COUNT_THRESHOLD=3
OVERDUE_BLOCK_DAYS_THRESHOLD=30
HOLD_EXPIRY_HOURS=48
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

Ý nghĩa các biến quan trọng:

| Biến | Ý nghĩa |
| --- | --- |
| `NODE_ENV` | Môi trường chạy backend. Local dùng `development`. |
| `PORT` | Port backend API, mặc định `5000`. |
| `MONGODB_URI` | Chuỗi kết nối MongoDB. Bắt buộc có `replicaSet=rs0`. |
| `REDIS_URL` | Chuỗi kết nối Redis local. |
| `JWT_SECRET` | Secret ký JWT. Phải dài ít nhất 32 ký tự. Không dùng secret thật trong tài liệu. |
| `JWT_ACCESS_TTL` | Thời gian sống access token, tính bằng giây. |
| `JWT_REFRESH_TTL` | Thời gian sống refresh token, tính bằng giây. |
| `SMTP_*` | Cấu hình gửi email. Local có thể để placeholder nếu chưa test email thật. |
| `FINE_BLOCK_THRESHOLD` | Ngưỡng tiền phạt để chặn/hạn chế tài khoản. |
| `OVERDUE_BLOCK_LOAN_COUNT_THRESHOLD` | Số khoản mượn đang quá hạn khiến hệ thống tự khóa thẻ. Mặc định `3`. |
| `OVERDUE_BLOCK_DAYS_THRESHOLD` | Số ngày quá hạn tối đa cho một khoản mượn trước khi tự khóa thẻ. Mặc định `30`. |
| `HOLD_EXPIRY_HOURS` | Số giờ giữ sách trước khi yêu cầu đặt giữ hết hạn. |
| `FRONTEND_URL` | URL frontend chính, dùng cho link hoặc CORS fallback. |
| `CORS_ORIGINS` | Danh sách origin được gọi API, phân tách bằng dấu phẩy. |

Lưu ý: đổi `JWT_SECRET` trong `.env` thành chuỗi local đủ dài, ví dụ tự tạo bằng password manager. Không commit `.env` thật lên git.

### Frontend env

Hai file local frontend hiện đã có trong repo:

- `client/reader/.env.development`
- `client/admin/.env.development`

Cả hai trỏ về backend local:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Nếu đổi `PORT` backend, cần cập nhật lại `VITE_API_BASE_URL` tương ứng.

## 5. Cài đặt dependencies

Dự án dùng npm workspaces, nên chỉ cần cài từ thư mục root:

```powershell
npm install
```

Không cần chạy `npm install` riêng trong từng thư mục con, trừ khi bạn đang debug workspace cụ thể.

Các dependency chính:

- Backend: Express 5, Mongoose 8, Redis/ioredis, BullMQ, Socket.IO, Zod, JWT, Nodemailer.
- Admin UI: React 18, Vite, Ant Design, React Query, Zustand.
- Reader UI: React 18, Vite, Tailwind, React Query, Zustand, Framer Motion, Lucide icons.
- Shared: TypeScript models/enums dùng chung.

## 6. Khởi tạo database hoặc dữ liệu ban đầu

### Seed dữ liệu cơ bản

Mục đích: tạo dữ liệu nền để có thể đăng nhập và test nghiệp vụ.

```powershell
npm run seed
```

Lệnh này chạy script seed trong `server` workspace. Dữ liệu seed gồm chính sách, cấu hình, tài khoản demo, danh mục, tác giả, sách và bản sao.

### Reset dữ liệu demo

Chỉ dùng khi muốn xóa và dựng lại các kịch bản demo nghiệp vụ:

```powershell
npm run seed:reset-demo
```

Cảnh báo: lệnh này có thể xóa dữ liệu vận hành demo như khoản mượn, đặt chỗ, đặt giữ, tiền phạt, thông báo, audit log và refresh token. Sau khi chạy, các session đang đăng nhập có thể bị mất hiệu lực.

### Tài khoản demo sau khi seed

Admin:

```text
Email: admin@library.edu
Password: Admin123!
```

Thủ thư:

```text
Email: librarian1@library.edu
Password: Passw0rd!
```

Bạn đọc:

```text
Email: student001@library.edu
Password: Passw0rd!

Email: lecturer1@library.edu
Password: Passw0rd!
```

## 7. Chạy dự án

Dùng ba terminal riêng.

### Terminal 1: chạy database và backend

Mục đích: bật MongoDB, Redis và backend API.

```powershell
docker start libero-mongo libero-redis
npm run dev
```

`npm run dev` ở root sẽ chạy:

```powershell
npm run dev --workspace server
```

Backend lắng nghe tại:

```text
http://localhost:5000/api/v1
```

### Terminal 2: chạy Reader UI

Mục đích: chạy giao diện bạn đọc.

```powershell
npm run dev:reader
```

Mở:

```text
http://localhost:5173/
```

### Terminal 3: chạy Admin UI

Mục đích: chạy giao diện quản trị/thủ thư.

```powershell
npm run dev:admin
```

Mở:

```text
http://localhost:5174/admin/
```

Admin UI dùng Vite `base: /admin/`, nên cần mở đúng `/admin/`.

## 8. Kiểm tra dự án đã chạy thành công

### Kiểm tra backend

```powershell
curl http://localhost:5000/api/v1/health
```

Kết quả tốt:

```json
{
  "status": "ok",
  "api": "ok",
  "db": "connected",
  "redis": "connected"
}
```

Nếu Redis chưa kết nối, local dev có thể thấy `status: degraded`, nhưng các tính năng queue/realtime sẽ không đầy đủ. Nên kiểm tra lại Redis trước khi test nghiệp vụ.

### Kiểm tra Reader UI

Mở:

```text
http://localhost:5173/
```

Dấu hiệu đúng:

- Trang reader tải được.
- Có thể đăng nhập bằng tài khoản bạn đọc demo.
- Các API gọi về `http://localhost:5000/api/v1`.

### Kiểm tra Admin UI

Mở:

```text
http://localhost:5174/admin/
```

Dấu hiệu đúng:

- Trang admin tải được.
- Có thể đăng nhập bằng tài khoản admin hoặc thủ thư demo.
- Không có lỗi `Network Error` trong console.

### Kiểm tra build và test

```powershell
npm run typecheck
npm run typecheck:admin
npm run typecheck:reader
npm run test
npm run test:admin
npm run test:reader
npm run build
npm run build:admin
npm run build:reader
```

## 9. Các lỗi thường gặp và cách xử lý

### Lỗi `MongooseServerSelectionError` hoặc `ReplicaSetNoPrimary`

Nguyên nhân thường gặp:

- MongoDB container chưa chạy.
- MongoDB chạy nhưng replica set `rs0` chưa được initiate.
- Port `27017` đang bị Windows Service MongoDB khác chiếm.

Cách xử lý:

```powershell
docker start libero-mongo
docker exec libero-mongo mongosh --quiet --eval "rs.status().myState"
```

Nếu chưa có replica set:

```powershell
docker exec libero-mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Nếu có MongoDB Windows Service chạy riêng, tắt service đó hoặc đổi port để Docker Mongo dùng được `27017`.

### Lỗi `ECONNREFUSED 127.0.0.1:27017`

Nguyên nhân: MongoDB chưa chạy hoặc port sai.

Cách xử lý:

```powershell
docker start libero-mongo
docker ps --filter "name=libero-mongo"
```

### Lỗi `ECONNREFUSED 127.0.0.1:6379`

Nguyên nhân: Redis chưa chạy.

Cách xử lý:

```powershell
docker start libero-redis
docker exec libero-redis redis-cli ping
```

Kết quả mong đợi là `PONG`.

### Lỗi frontend báo `Network Error`

Nguyên nhân:

- Backend chưa chạy.
- `VITE_API_BASE_URL` sai.
- Backend port `5000` bị đổi nhưng frontend env chưa cập nhật.

Cách xử lý:

```powershell
curl http://localhost:5000/api/v1/health
```

Kiểm tra file:

```text
client/reader/.env.development
client/admin/.env.development
```

### Port `5000`, `5173`, `5174`, `27017` hoặc `6379` bị chiếm

Nguyên nhân: process cũ hoặc service khác đang chạy.

Trên Windows, kiểm tra port:

```powershell
Get-NetTCPConnection -LocalPort 5000
Get-NetTCPConnection -LocalPort 5173
Get-NetTCPConnection -LocalPort 5174
Get-NetTCPConnection -LocalPort 27017
Get-NetTCPConnection -LocalPort 6379
```

Nếu là dev server cũ, dừng terminal cũ hoặc kill đúng process. Không kill bừa các process lạ nếu chưa biết chúng thuộc ứng dụng nào.

### Docker báo container name already exists

Nguyên nhân: container đã được tạo trước đó.

Cách xử lý thông thường:

```powershell
docker start libero-mongo libero-redis
```

Chỉ xóa container khi thật sự muốn tạo lại:

```powershell
docker rm -f libero-mongo libero-redis
```

Sau đó chạy lại lệnh `docker run`.

### Docker Desktop hoặc WSL bị kẹt

Nguyên nhân có thể là Docker Desktop/WSL chưa shutdown sạch.

Cách xử lý theo mức độ:

```powershell
wsl --shutdown
```

Sau đó mở lại Docker Desktop. Nếu `wsl --shutdown` treo lâu hoặc Docker Desktop liên tục báo timeout, restart Windows là cách sạch nhất.

### Admin mở sai URL

Admin app dùng base path `/admin/`.

Đúng:

```text
http://localhost:5174/admin/
```

Sai:

```text
http://localhost:5174/
```

### Seed xong vẫn không đăng nhập được

Nguyên nhân:

- Đang dùng sai loại tài khoản cho UI.
- Session cũ bị invalid sau `seed:reset-demo`.
- Dữ liệu demo đã bị thay đổi.

Cách xử lý:

```powershell
npm run seed
```

Nếu cần reset demo hoàn toàn:

```powershell
npm run seed:reset-demo
```

Sau đó đăng nhập lại bằng tài khoản demo ở phần trên.

### Vite báo chunk lớn hơn 500 kB

Ví dụ:

```text
Some chunks are larger than 500 kB after minification
```

Đây là cảnh báo bundle size, không phải lỗi build. Build vẫn thành công nếu exit code là `0`.

## 10. Ghi chú bổ sung

- Dự án hiện không có `docker-compose.yml`; hướng setup local dùng `docker run`.
- MongoDB phải chạy dạng replica set `rs0`; không dùng Mongo standalone nếu muốn các flow transaction hoạt động ổn định.
- Backend có thể đọc `.env` ở root hoặc `server/.env`; nếu cả hai cùng tồn tại, `server/.env` được load trước.
- Frontend Vite dùng `strictPort: true`; nếu port bị chiếm, Vite sẽ lỗi thay vì tự nhảy port.
- Khi không dùng dự án nữa, có thể dừng database bằng:

```powershell
docker stop libero-mongo libero-redis
```

- Khi bật máy lại, chỉ cần:

```powershell
docker start libero-mongo libero-redis
```

- Không commit các file chứa secret thật như `.env`, token, password cá nhân hoặc SMTP credential thật.
