# UPDATE - Libero Project Context Compact

File này dùng để mở cửa sổ chat mới và tiếp tục dự án mà không mất mạch.

## 1. Bối Cảnh Dự Án

- Repo: `Libero`
- Monorepo gồm:
  - `server/`: Express + TypeScript + Mongoose + MongoDB + Socket.IO
  - `client/admin/`: React + Vite + TypeScript + Tailwind/Ant Design
  - `client/reader/`: React + Vite + TypeScript + Tailwind
  - `shared/`: shared types/models
- App là hệ thống thư viện:
  - Reader: tìm sách, đặt giữ, đặt chỗ, xem khoản mượn, tiền phạt, hồ sơ, notification.
  - Admin: quản lý sách, độc giả, khoản mượn, đặt chỗ, đặt giữ, phạt, báo cáo, chính sách.

## 2. Các Câu Hỏi/Nghiệp Vụ Đã Trao Đổi

### Auth và lỗi 401

User hỏi vì sao admin/reader console báo `401 Unauthorized` ở `/auth/refresh`, `/members/me`, `/members`.

Kết luận:
- Đây là do access token/refresh token hết hạn, bị xóa, hoặc seed/reset làm mất refresh token.
- UI gọi API cần auth mà không còn session hợp lệ nên backend trả 401.
- Không phải lỗi layout UI.

### Seed làm mất dữ liệu test

User test flow xong, xóa phiên cũ, chạy lại `npm run seed`, đăng nhập lại thì mất dữ liệu loans/reservations/admin.

Kết luận:
- `server/src/scripts/seed.ts` hiện chạy:
  - `resetDemoOperationalData()`
  - `seedOperationalScenarios(...)`
- `resetDemoOperationalData()` đang xóa:
  - `LoanRecordModel.deleteMany({})`
  - `ReservationModel.deleteMany({})`
  - `FineRecordModel.deleteMany({})`
  - `NotificationLogModel.deleteMany({})`
  - `AuditLogModel.deleteMany({})`
  - `RefreshTokenModel.deleteMany({})`
- Nên chạy seed lại là mất dữ liệu vận hành và mất phiên đăng nhập.

Khuyến nghị:
- Tách seed thành 2 chế độ:
  - `seed`: chỉ upsert dữ liệu nền như sách, danh mục, admin, member mẫu, policy.
  - `seed:reset-demo`: mới xóa loans/reservations/fines/notifications/tokens và tạo lại scenario demo.
- Hoặc dùng DB riêng cho demo seed, DB riêng cho test nghiệp vụ thật.

### Barcode, mã thẻ thư viện, ISBN, mã phiếu mượn

Kết luận:
- Barcode: định danh từng bản sao vật lý của sách. Dùng khi mượn/trả/quét sách.
- Mã thẻ thư viện: định danh độc giả/member. Dùng khi admin tìm người mượn.
- ISBN: định danh đầu sách/xuất bản phẩm, không định danh từng bản sao.
- Mã phiếu mượn: định danh giao dịch mượn/trả.
- Không cái nào thừa về logic; nếu gây lệch UI thì cần rút gọn hiển thị, ellipsis, tooltip, hoặc chuyển sang detail view.

### Book cover không dùng ảnh thật

User quyết định hiện tại không dùng ảnh thật, nhưng tương lai admin upload ảnh thật thì vẫn phải dùng.

Đã xử lý theo hướng:
- Tạo/gom component cover vẽ bằng màu nền, gradient, initials/tên sách.
- Vẫn giữ `src/coverImage`; nếu sau này có ảnh thật thì component ưu tiên render ảnh thật.
- Không loại bỏ hoàn toàn logic ảnh thật.

### Reader header hiện "Bạn đọc"

User hỏi vì sao profile/header hiển thị "Bạn đọc".

Kết luận:
- Đây là fallback khi API `/members/me` chưa trả full name hoặc chưa có user profile trong store.
- Không phải "tối ưu nhất"; có thể sửa để ưu tiên `fullName`, sau đó mới fallback role label.

### Book hold nghiệp vụ mới

User muốn thêm nghiệp vụ:
- Nếu sách còn bản sẵn: reader hiển thị nút `Đặt giữ`.
- Khi đặt giữ: hệ thống trừ tạm 1 bản trong số lượng sẵn có và chuyển trạng thái thành `Đang chờ lấy`.
- Nếu hết sách: reader hiển thị nút `Đặt chỗ`.
- Một user được đặt giữ tối đa 3 đầu sách cùng lúc.
- Thời hạn giữ 24h.
- Quá 24h hoặc admin can thiệp thì trả lại bản sao.
- Cần có UI admin.

Kết luận thiết kế:
- Chọn hướng tạo model mới `BookHold`.
- `BookHold` khác `Reservation`:
  - `BookHold`: sách còn bản, giữ bản cụ thể trong 24h.
  - `Reservation`: sách hết bản, user vào hàng đợi.

### Đặt chỗ và notification

User hỏi flow đặt chỗ hiện tại và admin có tác động gì không.

Kết luận:
- Reservation là hàng đợi khi sách hết bản.
- Khi sách được trả, hệ thống cần đẩy hàng đợi, chuyển user tiếp theo sang trạng thái notified, gửi notification "đã đến lượt".
- Admin cần có thao tác xác nhận user đã trả sách hoặc flow trả sách phải tự trigger queue.

### Socket.IO

User hỏi dự án tích hợp được Socket.IO không và dùng cho tính năng nào.

Kết luận:
- Có thể và đã tích hợp.
- Phù hợp cho:
  - Notification real-time cho reader/admin.
  - Admin table đặt chỗ/đặt giữ tự cập nhật khi reader gửi request.
  - Khoản mượn/trả sách cập nhật realtime.
  - Book availability thay đổi realtime.
  - Badge counter notification/header.

## 3. Backend Đã Thay Đổi

### Socket.IO

Đã thêm realtime layer:
- `server/src/realtime/realtime.ts`
- `server/src/server.ts` khởi tạo Socket.IO cùng HTTP server.

Realtime dùng JWT socket auth:
- User join room `member:<id>`.
- Admin/librarian join room `backoffice`.

Events chính:
- `notification:new`
- `library:event`

Notification service và domain services emit event để client invalidate query.

### Notification

Các thay đổi liên quan:
- `server/src/modules/notification/notification.controller.ts`
- `server/src/modules/notification/notification.routes.ts`
- `server/src/modules/notification/notification.service.ts`
- `server/src/models/NotificationLog.model.ts`

Ý tưởng:
- Reader nhận notification khi:
  - đặt giữ thành công
  - đặt chỗ thành công
  - đến lượt nhận sách
  - mượn/trả/phạt liên quan
- Admin nhận notification khi:
  - reader tạo đặt chỗ
  - reader tạo đặt giữ
  - nghiệp vụ cần xử lý backoffice

### BookHold

Đã thêm module/model BookHold:
- `server/src/models/BookHold.model.ts`
- `server/src/modules/bookHold/`
- Route/API book hold đã có controller/service/repository/validator/types.

Các trạng thái:
- `ACTIVE`: Đang chờ lấy
- `FULFILLED`: Đã nhận
- `CANCELLED`: Đã trả lại
- `EXPIRED`: Hết hạn

Logic chính:
- Tạo hold khi sách còn bản sẵn.
- Giữ một copy cụ thể.
- Giới hạn active hold theo member là 3.
- Expire sau 24h qua `holdExpiry.job.ts`.
- Cancel/expire trả lại trạng thái copy.
- Khi admin xác nhận độc giả nhận sách, flow checkout sẽ chuyển hold sang fulfilled và tạo loan.

### Loan/Reservation liên quan BookHold

Đã có logic liên kết:
- `server/src/modules/loan/loan.repository.ts`
- `server/src/modules/loan/loan.service.ts`
- `server/src/modules/reservation/reservation.repository.ts`
- `server/src/modules/reservation/reservation.service.ts`

Điểm quan trọng:
- Checkout có thể fulfill active BookHold.
- Reservation không nên tạo trùng nếu user đang có active BookHold cho cùng sách.
- Khi return/cancel/expire cần cân bằng lại availability/hàng đợi.

### Seed

File quan trọng:
- `server/src/scripts/seed.ts`

Hiện trạng:
- Seed hiện vẫn reset dữ liệu vận hành demo, gây mất dữ liệu test nếu chạy lại.
- Cần refactor seed thành chế độ "không phá dữ liệu" nếu muốn test flow lâu dài.

## 4. Reader Đã Thay Đổi

### Layout/Header/Notification

Các file đáng chú ý:
- `client/reader/src/layouts/ReaderLayout.tsx`
- `client/reader/src/components/layout/ReaderHeader.tsx`
- `client/reader/src/components/layout/NotificationBell.tsx`
- `client/reader/src/hooks/useRealtime.ts`
- `client/reader/src/services/realtime.ts`
- `client/reader/src/services/notification.api.ts`
- `client/reader/src/store/notifications.store.ts`

Reader layout gọi `useRealtime()` để connect socket khi user đã login.

### Book cover/card

Các file đáng chú ý:
- `client/reader/src/components/book/BookCover.tsx`
- `client/reader/src/components/book/BookCard.tsx`
- `client/reader/src/pages/Home/sections/BookShelves.tsx`
- `client/reader/src/pages/Search/index.tsx`
- `client/reader/src/pages/BookDetail/index.tsx`

Đã chuyển sang cover giả lập bằng màu/gradient/tên sách, vẫn giữ khả năng render ảnh thật nếu có `coverImage`.

### Home UI

User yêu cầu chỉnh sát mockup:
- Card gần nhau hơn.
- Shelf book card to hơn.
- Shelf cố định 2 hàng; nếu nhiều card thì có button sang phải như mockup.
- Hover màu xanh cho shelf book card.

Đã chỉnh nhiều phần ở:
- `client/reader/src/pages/Home/sections/BookShelves.tsx`
- `client/reader/src/pages/Home/sections/HeroSearch.tsx`
- `client/reader/src/pages/Home/sections/QuickStats.tsx`
- `client/reader/src/pages/Home/sections/RecentActivity.tsx`

### Book detail đặt giữ/đặt chỗ

Các file đáng chú ý:
- `client/reader/src/pages/BookDetail/index.tsx`
- `client/reader/src/pages/BookDetail/sections/AvailabilityCard.tsx`
- `client/reader/src/services/bookHold.api.ts`
- `client/reader/src/services/reservation.api.ts`

Ý tưởng UI:
- Còn bản: hiển thị `Đặt giữ`.
- Hết bản: hiển thị `Đặt chỗ`.
- Có active hold/reservation thì hiển thị trạng thái tương ứng.

### Thông báo lỗi tiếng Việt

User thấy toast tiếng Anh: `Member has reached the active hold limit`.

Đã đổi hướng xử lý:
- Map error code/message sang tiếng Việt thân thiện trong `client/reader/src/utils/format.ts`.
- Server cũng nên trả message rõ hơn nếu cần.

Thông điệp mong muốn:
- "Bạn đã đạt giới hạn 3 sách đang đặt giữ. Vui lòng nhận hoặc hủy bớt sách trước khi đặt giữ tiếp."

## 5. Admin Đã Thay Đổi

### Admin layout/routes

Các file đáng chú ý:
- `client/admin/src/layouts/AdminLayout.tsx`
- `client/admin/src/routes.tsx`
- `client/admin/src/hooks/useRealtime.ts`
- `client/admin/src/services/realtime.ts`

Admin layout gọi `useRealtime()` để nhận events realtime và invalidate query.

### Admin BookHold UI

File chính:
- `client/admin/src/pages/BookHolds/BookHoldList.tsx`
- `client/admin/src/services/bookHold.api.ts`

Đã có:
- Table danh sách đặt giữ.
- Filter trạng thái.
- Modal tạo đặt giữ cho độc giả.
- Nút `Tạo đặt giữ`.
- Nút `Xác nhận nhận` khi hold đang `ACTIVE`.

Các stat card đã chỉnh đủ 4 trạng thái:
- `Đang chờ lấy`
- `Đã nhận`
- `Đã trả lại`
- `Hết hạn`

Khi admin bấm `Xác nhận nhận`:
- Gọi `loanApi.checkout({ memberId, barcode })`.
- Backend checkout fulfill hold và tạo loan.
- Invalidate `book-holds`, `loans`, `catalog`.

### Admin Reservation UI

File chính:
- `client/admin/src/pages/Reservations/ReservationList.tsx`
- `client/admin/src/services/reservation.api.ts`

Đã có:
- Table đặt chỗ.
- Modal tạo đặt chỗ cho user khác.
- Admin có thể cancel/delete reservation.
- Realtime invalidate khi có reservation event.

Vấn đề nghiệp vụ còn cần cân nhắc:
- Admin cần flow rõ cho "đến lượt nhận sách" khi copy được trả.
- Queue reservation phải tự đẩy user tiếp theo và gửi notification.

### Admin khoản mượn

File chính:
- `client/admin/src/pages/Circulation/Checkout.tsx`
- `client/admin/src/pages/Circulation/CreateCheckout.tsx`
- `client/admin/src/services/loan.api.ts`

Đã có:
- List khoản mượn.
- KPI stat cards.
- Tạo phiếu mượn.
- Return/renew/lost actions.
- Gap giữa nút `Tạo phiếu mượn` và stat cards đã chỉnh giống màn Sách:
  - Màn Sách dùng `space-y-7` = 28px.
  - Màn Khoản mượn đã đổi từ `space-y-5` sang `space-y-7`.

### Admin button pattern

User yêu cầu tất cả nút create/add giống nút `Tạo phiếu mượn`: nền trắng, chữ/icon xanh, shadow nhẹ.

Đã thêm class chung:
- `client/admin/src/components/AdminSurface.tsx`
- `primaryActionButtonClass`

Style hiện tại:
- nền trắng
- text/icon xanh `#1677ff`
- shadow xanh nhẹ
- hover xanh nhạt
- ép icon Ant Design dùng `text-current`

Đã áp dụng cho các nút chính:
- `Tạo phiếu mượn`
- `Nhập CSV`
- `Thêm sách`
- `Thêm độc giả`
- `Thêm danh mục`
- `Tạo đặt chỗ`
- `Tạo đặt giữ`
- `Tạo khoản phạt`
- `Thêm mức phạt`
- action chính trong chi tiết sách

File liên quan:
- `client/admin/src/components/AdminSurface.tsx`
- `client/admin/src/pages/Catalog/BookList.tsx`
- `client/admin/src/pages/Circulation/Checkout.tsx`
- `client/admin/src/pages/Members/MemberList.tsx`
- `client/admin/src/pages/Catalog/CategoryList.tsx`
- `client/admin/src/pages/Reservations/ReservationList.tsx`
- `client/admin/src/pages/BookHolds/BookHoldList.tsx`
- `client/admin/src/pages/Fines/FineManager.tsx`
- `client/admin/src/pages/Settings/FineRates.tsx`

### Admin card/stat pattern

User muốn card các màn còn lại lấy kích thước bộ card màn Sách làm chuẩn.

Đã chỉnh một phần:
- Màn Khoản mượn card/gap đã align theo màn Sách.
- Màn Đặt giữ đã có 4 card trạng thái.

Cần kiểm tra tiếp nếu còn màn admin nào lệch pattern.

## 6. Files Quan Trọng Cần Mở Khi Tiếp Tục

Backend:
- `server/src/scripts/seed.ts`
- `server/src/realtime/realtime.ts`
- `server/src/server.ts`
- `server/src/jobs/holdExpiry.job.ts`
- `server/src/models/BookHold.model.ts`
- `server/src/modules/bookHold/bookHold.service.ts`
- `server/src/modules/loan/loan.service.ts`
- `server/src/modules/reservation/reservation.service.ts`
- `server/src/modules/notification/notification.service.ts`

Admin:
- `client/admin/src/components/AdminSurface.tsx`
- `client/admin/src/layouts/AdminLayout.tsx`
- `client/admin/src/hooks/useRealtime.ts`
- `client/admin/src/services/realtime.ts`
- `client/admin/src/pages/Catalog/BookList.tsx`
- `client/admin/src/pages/Circulation/Checkout.tsx`
- `client/admin/src/pages/Circulation/CreateCheckout.tsx`
- `client/admin/src/pages/BookHolds/BookHoldList.tsx`
- `client/admin/src/pages/Reservations/ReservationList.tsx`

Reader:
- `client/reader/src/components/layout/ReaderHeader.tsx`
- `client/reader/src/hooks/useRealtime.ts`
- `client/reader/src/services/realtime.ts`
- `client/reader/src/components/book/BookCover.tsx`
- `client/reader/src/components/book/BookCard.tsx`
- `client/reader/src/pages/Home/sections/BookShelves.tsx`
- `client/reader/src/pages/BookDetail/index.tsx`
- `client/reader/src/pages/BookDetail/sections/AvailabilityCard.tsx`
- `client/reader/src/utils/format.ts`

## 7. Verification Đã Chạy Gần Đây

Các lệnh đã pass trong lượt gần nhất:
- `npm run typecheck:admin`
- `npm run build:admin`

Build admin còn warning Vite chunk lớn hơn 500kB, không phải lỗi compile.

Trước đó cũng đã có nhiều lần chạy:
- `npm run typecheck:reader`
- `npm run build:reader`
- server tests/typecheck một phần

Khi mở chat mới, nếu chuẩn bị sửa lớn nên chạy lại:
- `npm run typecheck:admin`
- `npm run typecheck:reader`
- `npm run test --workspace server`

## 8. Việc Nên Làm Tiếp

### Ưu tiên cao

1. Refactor seed để không phá dữ liệu test:
   - Tách `seed` và `seed:reset-demo`.
   - Không xóa `RefreshTokenModel` trong seed thường.
   - Không xóa loans/reservations/bookHolds/fines trong seed thường.

2. Rà lại flow reservation queue:
   - Khi trả sách, nếu có reservation waiting thì notify user tiếp theo.
   - Admin/reader notification phải realtime.
   - Trạng thái `NOTIFIED`/hold expiry cần nhất quán.

3. Test BookHold end-to-end:
   - Reader đặt giữ khi còn bản.
   - Available copies giảm.
   - Admin thấy hold realtime.
   - Admin xác nhận nhận.
   - Hold chuyển `FULFILLED`.
   - Loan được tạo.
   - Reader nhận notification.

### Ưu tiên UI

1. Rà toàn bộ admin screens còn lệch pattern:
   - card stat
   - action buttons
   - toolbar gap
   - table padding

2. Rà reader home/search/book detail bằng DOM/Chrome DevTools MCP nếu có.

3. Tiếp tục chuẩn hóa text tiếng Việt thân thiện cho toast/backend error.

## 9. Ghi Chú Quan Trọng

- Worktree đang rất dirty, nhiều file đã sửa/tạo/xóa. Không được tự revert.
- User muốn code thực tế, không chỉ giải thích.
- User ưu tiên UI sát mockup, nhưng không đổi content nếu chỉ yêu cầu pattern/layout.
- User không muốn dùng ảnh thật hiện tại, nhưng vẫn muốn future-proof nếu admin upload ảnh thật.
- Khi nói về seed, trạng thái mới là: `npm run seed` không còn reset dữ liệu vận hành demo; `npm run seed:reset-demo` mới là lệnh xóa/reset loans, reservations, book holds, fines, notifications, audit logs và refresh tokens.

## 10. Cập Nhật Phiên 2026-05-14

### Seed / demo data

- Đã refactor seed thành 2 chế độ:
  - `npm run seed`: chỉ đảm bảo base data như policies, fine rate, admin/demo members, categories, authors, books và copies. Không xóa dữ liệu vận hành demo.
  - `npm run seed:reset-demo`: reset dữ liệu demo có tính destructive, gồm loans, reservations, book holds, fines, notifications, audit logs và refresh tokens.
- `BookHoldModel` đã được đưa vào nhóm reset demo để tránh case seed cũ xóa reader flow nhưng admin BookHold vẫn còn.
- Seed thường không reset password/account state của member đang tồn tại. Việc reset tài khoản chỉ nằm trong reset-demo.
- Kết luận vận hành: không cần chạy `npm run seed` mỗi lần mở phiên mới. Chỉ chạy khi DB thiếu base data; dùng `seed:reset-demo` khi chủ động muốn quay về demo sạch.

### Auth / member registration

- Đã bỏ logic sinh viên public register phải chờ duyệt:
  - Register public tạo member `Student` với status `Active`.
  - Login với member legacy status `Pending` sẽ auto chuyển sang `Active`.
  - Reader register copy đã đổi sang thông báo có thể đăng nhập ngay.
- Admin Members đã bỏ KPI/action duyệt tài khoản pending. Cột/action hiện tại giữ các hành động vận hành như xem, sửa, khóa/mở khóa, menu khác. KPI pending được thay bằng KPI hết hạn.
- Đã sửa bug số điện thoại đăng ký không hiện trong admin:
  - Reader register submit thêm `phone`.
  - Shared `RegisterPayload`, backend validator/types/service nhận và lưu `phone`.
  - Test auth đã assert phone được persist.

### Admin UI polish

- Đã chuẩn hóa nhiều native select/dropdown trong admin sang `AdminSelect` dùng Ant Design Select và style chung.
- Đã đổi font weight của các action/filter buttons từ quá đậm sang `font-semibold`, gần hơn style select trong UI.
- Đã chuẩn hóa pagination active từ nền tím/xanh đặc sang nền trắng, text xanh, border/ring xanh giống button create.
- Đã chỉnh badge trạng thái ở màn khoản mượn/circulation để khớp pattern badge các màn khác, gồm label tiếng Việt và màu pill nhất quán.

### Reader shelves

- Reader home:
  - `Sách phổ biến` lấy từ `/books/popular` với `windowDays=30`.
  - `Gợi ý cho bạn` lấy từ endpoint recommendation theo user đang đăng nhập.
- Backend popular books đã sửa query từ field sai `borrowDate` sang `checkoutDate` của `LoanRecord`.
- Để 2 shelf có data:
  - Popular cần có loan trong 30 ngày gần nhất.
  - Recommendation cần user đăng nhập có lịch sử mượn để suy ra danh mục/tác giả liên quan.

### Files liên quan trong phiên này

- `server/src/scripts/seed.ts`
- `server/src/modules/catalog/catalog.repository.ts`
- `server/src/modules/member/auth.service.ts`
- `server/src/modules/member/auth.validator.ts`
- `server/src/modules/member/auth.types.ts`
- `server/src/modules/member/authStatus.ts`
- `server/src/models/Member.model.ts`
- `shared/src/models.ts`
- `client/reader/src/pages/Register/sections/RegisterForm.tsx`
- `client/reader/src/pages/Home/sections/BookShelves.tsx`
- `client/admin/src/components/AdminSurface.tsx`
- `client/admin/src/pages/Members/MemberList.tsx`
- `client/admin/src/pages/Circulation/Checkout.tsx`
- `client/admin/src/styles.css`
- `server/tests/unit/auth.service.test.ts`
- `server/tests/integration/auth.test.ts`

### Verification đã chạy

- `npm run typecheck`
- `npm run typecheck:admin`
- `npm run typecheck:reader`
- `npm run build:admin`
- `npm run build:reader`
- `npm run test --workspace server -- --runTestsByPath tests/unit/auth.service.test.ts`
- `npm run test --workspace server -- --runTestsByPath tests/integration/auth.test.ts`

Ghi chú: `npm run build:admin` pass nhưng Vite vẫn cảnh báo chunk lớn hơn 500kB. Đây là warning bundle size, không phải lỗi compile.

## 11. Cập Nhật Phiên 2026-05-30

Mục này compact lại toàn bộ bối cảnh mới nhất trong phiên làm việc dài sau mốc 2026-05-14. Đây là trạng thái hiện tại của dự án trong worktree, chưa phải snapshot đã commit.

### Runtime, Docker, seed và dữ liệu demo

- Lỗi `Network Error` ở admin/reader có nguyên nhân chính là frontend gọi `http://localhost:5000/api/v1/auth/login` nhưng backend server chưa chạy hoặc không lắng nghe port `5000`, dẫn tới `ERR_CONNECTION_REFUSED`.
- MongoDB và Redis đang dùng Docker, nên Docker Desktop và containers phải chạy trước. Tuy nhiên Docker chỉ là hạ tầng DB/cache; vẫn phải chạy backend bằng `npm run dev --workspace server`.
- Cảnh báo VSCode về `https://www.schemastore.org/tsconfig` không load được schema là lỗi mạng/schema của editor, không phải nguyên nhân login hay API lỗi.
- Nếu đã test e2e thủ công và muốn giữ dữ liệu, không chạy `npm run seed:reset-demo`. Lệnh này có tính destructive và sẽ reset dữ liệu vận hành demo như loans, reservations, book holds, fines, notifications, audit logs, refresh tokens.
- `npm run seed` chỉ nên dùng khi cần đảm bảo base data. Không cần chạy lại mỗi ngày nếu DB vẫn còn dữ liệu và Docker volumes chưa bị xóa.
- Khi cần demo sạch từ đầu thì dùng `npm run seed:reset-demo`, nhưng phải chấp nhận mất dữ liệu test tay trước đó.

### Trạng thái logic dự án

- Với phạm vi đồ án môn học, phần logic nghiệp vụ đã gần hoàn thiện để demo: đăng ký, đăng nhập, catalog, copies, đặt giữ, đặt chỗ, mượn trả, gia hạn, quá hạn, phạt, báo mất, báo cáo và dashboard admin.
- Các lỗi backend đáng chú ý đã được rà và sửa trong quá trình làm:
  - Backend không chạy làm frontend không đăng nhập được.
  - API return loan từng trả `500 Internal Server Error` ở `/api/v1/loans/:id/return`.
  - Dashboard admin cần biểu đồ thống kê mượn sách dùng data thật thay vì mock/static.
  - Popular books backend đã sửa query dùng đúng `checkoutDate` thay vì field sai.
- Luồng còn cần tiếp tục kiểm thử thủ công trước demo: book hold, reservation khi hết sách, checkout, return, renew, overdue, fine, lost copy và notification admin.

### Admin notification

- UI notification admin phải nhận thông báo từ tất cả nghiệp vụ quan trọng, không chỉ một flow riêng lẻ.
- Các flow cần hiện notification:
  - Có reader mới đăng ký tài khoản.
  - Có yêu cầu đặt giữ sách mới.
  - Có yêu cầu đặt chỗ khi sách hết.
  - Hold/reservation được duyệt, hoàn tất, hủy hoặc hết hạn.
  - Checkout/mượn sách mới.
  - Return/trả sách.
  - Báo mất sách.
  - Loan quá hạn.
  - Fine phát sinh, được thanh toán hoặc được miễn giảm.
  - Thay đổi trạng thái tài khoản reader khi ảnh hưởng quyền mượn.
- Thứ tự triển khai đã chốt: làm theo cụm trước gồm new user, book hold/reservation và core circulation notification.

### Admin UI và layout

- Bỏ light/dark mode khỏi admin vì không cần trong phạm vi dự án.
- Sidebar admin không nên chứa profile/logout ở đáy nữa. Profile actions chuyển lên header giống reader.
- Header admin cần có dropdown tài khoản gồm `Hồ sơ của tôi` và `Đăng xuất`, dùng được cho librarian/admin account.
- Bỏ hamburger/toggle sidebar và các phần liên quan vì không dùng.
- Logo admin cần đi theo concept logo reader, không dùng biểu tượng chữ `L` tự vẽ.
- Dashboard admin đang được chỉnh để dùng biểu đồ/report data thật từ backend.

### README và setup máy khác

- README cần mô tả đầy đủ setup để người khác chạy được dự án:
  - Cài Node.js/npm phù hợp.
  - Cài Docker Desktop.
  - Chạy MongoDB và Redis bằng Docker.
  - Cài dependencies ở root.
  - Tạo/cấu hình `.env` cho server, admin và reader.
  - Chạy seed đúng mục đích: `npm run seed` để đảm bảo base data, `npm run seed:reset-demo` để reset demo sạch.
  - Chạy backend, admin và reader ở các terminal riêng.
- Có thể mở terminal khác để chạy git push trong lúc dự án đang chạy. Việc này không ảnh hưởng các dev server nếu không tắt terminal đang chạy app.

### Cover image thật và dữ liệu sách

- Yêu cầu mới: bỏ cách "vẽ" ảnh bìa/fallback giả bằng nền CSS làm nguồn chính. Mỗi đầu sách cần có `coverImage` là URL ảnh thật, kèm mô tả/tóm tắt phù hợp.
- `server/src/scripts/seed.ts` đã được mở rộng với các URL Unsplash cho dữ liệu sách nền.
- `shared/src/bookVisuals.ts` có `DEFAULT_BOOK_COVER_IMAGE` cho sách CSV hoặc sách thiếu ảnh.
- `shared/src/models.ts` và các type/service backend đã bổ sung `coverImage` để truyền ảnh qua nhiều nghiệp vụ.
- Các module backend đã hoặc cần đảm bảo trả `coverImage` trong book ref:
  - Catalog.
  - Loan.
  - Reservation.
  - Book hold.
  - Fine.
  - Report.
- Một số ảnh tiêu biểu đã gán:
  - `Clean Code`: `photo-1555066931-4365d14bab8c`.
  - `Design Patterns`: `photo-1618005182384-a83a8bd57fbe`.
  - `Sapiens`: `photo-1451187580459-43490279c0fa`.
  - `Nhà Giả Kim`: `photo-1512820790803-83ca734da794`.
  - `Thinking, Fast and Slow`: `photo-1506126613408-eca07ce68773`.
  - `Dạy Con Làm Giàu`: `photo-1526304640581-d334cdbbf45e`.
  - `Lược Sử Thời Gian`: `photo-1462331940025-496dfbfc7564`.
  - Default CSV: `photo-1543002588-bfa74002ed7e`.
  - `Bộ công cụ tư duy phản biện`: `photo-1454165804606-c3d57bc86b40`.

### Reader UI direction

- Phạm vi redesign hiện tại ưu tiên reader. Admin chỉ cần polish UI, không cần motion sâu.
- Ràng buộc quan trọng: không đổi business logic, API flow, persistence hay kiểu dữ liệu nghiệp vụ nếu không cần cho UI.
- Theme reader chuyển từ tím sang xanh nước biển/ocean blue cho navigation, hero và action chính.
- Font direction:
  - Inter cho UI text.
  - Playfair Display hoặc Space Grotesk cho heading lớn.
  - JetBrains Mono cho barcode, ISBN, mã copy, ngày, tiền phạt.
- Tránh UI "AI slop": không gradient lòe loẹt, không neon, không card lồng card, không text quá lớn trong panel nhỏ, không icon tự vẽ khi có icon thư viện.

### Reader header và navigation

- Global Reader Layout cơ bản giữ nguyên.
- Logo/header reader đổi sang concept icon cuốn sách/thư viện từ thư viện icon, không dùng logo chữ `L`.
- Navigation active chỉ đổi màu chữ/icon sang xanh nước biển. Không dùng nền chữ nhật/pill lớn như trước.
- Header tiếp tục giữ menu tài khoản theo concept reader.

### Reader home

- Hero/viewport section đã chuyển sang dark premium card theo mockup.
- Search bar trong hero đã bị bỏ theo yêu cầu.
- Feature footer trong hero gồm các lợi ích như đặt giữ trực tuyến, hàng chờ tự động, kỷ luật minh bạch. Phần đáy đã được yêu cầu kéo sát content hơn nhiều lần, tức giảm khoảng trống dưới feature row.
- Quick Stats giữ lại nhưng chỉnh font. Reader summary bị bỏ vì thông tin đã có ở `Hồ sơ của tôi`.
- Các section sách đổi theo mockup:
  - `Gợi ý xuất sắc cho bạn`.
  - `Hoạt động của tôi`, dùng màu tím cũ và hover border tím.
  - `Tác phẩm được mượn nhiều`, dùng xanh lá và hover border xanh lá.
  - `Có thể bạn sẽ thích`, dùng đỏ và hover border đỏ.
- Book card trang chủ:
  - Dùng ảnh thật.
  - Bỏ ISBN trên card.
  - Tăng chiều cao ảnh.
  - Đẩy text xuống dưới ảnh.
  - Áp dụng style chung cho các card.
- Đã sửa lỗi wrapper icon bị lệch/hỏng ở khu vực hero feature và hoạt động.

### Reader book detail

- Trang chi tiết sách được chuyển sang modal overlay thay vì page gần full viewport.
- Modal phải bám mockup:
  - Header `CHI TIẾT TÁC PHẨM`, icon sách và nút đóng.
  - Cột trái: ảnh bìa, category pill, tổng số cuốn, sẵn có, action button.
  - Cột phải: tiêu đề, tác giả, năm xuất bản, ISBN, mã sách, ngôn ngữ, tóm tắt, bảng copy vật lý.
  - Dưới cùng vẫn giữ `Sách liên quan`, dùng card giống trang chủ.
- Modal đã được thu nhỏ nhiều lần theo yêu cầu, không chiếm gần full viewport.
- Bỏ footer trong modal: `Libero Smart Library Protocol v2.5` và dòng hướng dẫn `Bấm ESC hoặc nhấp bên ngoài để đóng`.
- Button `Đặt giữ sách (Book Hold)` đổi thành `Đặt giữ sách`.
- Khi hết sách:
  - Button reservation đổi sang màu cam.
  - Text button giữ theo nghiệp vụ hiện tại, ví dụ `Đặt chỗ sách` hoặc `Đặt chỗ hàng đợi (Reservation)` tùy trạng thái đang dùng trong UI.
  - `Sẵn có 0 bản` đổi sang màu đỏ, không để xanh lá.
- Bảng copy vật lý đổi trạng thái sang tiếng Việt:
  - `Available` -> `Có sẵn`.
  - `Borrowed` -> `Đang mượn`.
  - `Reserved` -> `Đang giữ chỗ`.
  - `Maintenance` -> `Bảo trì`.
  - `Lost` -> `Thất lạc`.

### Reader search

- Search page redesign theo mockup nhưng vẫn giữ 2 kiểu xem: lưới và danh sách.
- Grid view dùng card giống trang chủ.
- List view dùng layout theo mockup nhưng bỏ CTA `Yêu cầu ấn bản ngay`.
- Filter sidebar bị bỏ. Bộ lọc chuyển lên cạnh search bar ở dạng button, khi bấm mới xổ option.
- Filter popover gồm tình trạng và chủ đề/category, sử dụng data thật từ catalog/search state.

### Reader my loans

- Trang `Khoản mượn` được redesign theo hướng kết hợp mockup với logic thật.
- Header giữ text:
  - `Khoản mượn của tôi`.
  - `Quản lý các cuốn sách bạn đang mượn và lịch sử mượn.`
- Bên phải header có entry `Hướng dẫn mượn và gia hạn`.
- Khi bấm hướng dẫn sẽ mở modal chứa chính sách mượn và gia hạn của dự án, lấy số ngày mượn, số lần gia hạn, số ngày gia hạn từ data thật nếu loan có policy snapshot.
- Summary cards giữ concept 3 thẻ:
  - Tổng số đang mượn.
  - Sắp đến hạn.
  - Quá hạn.
- Active loan cards:
  - Dùng API thật `/loans/me`.
  - Không dùng layout 2 cột. Giữ 1 cột để dễ đọc.
  - Card redesign theo mockup: ảnh bên trái lớn hơn, content bên phải gọn hơn, status/action rõ hơn.
  - Hỗ trợ nhiều status thực tế, không hardcode một trạng thái.
  - Renew vẫn dùng mutation thật `loanApi.renewLoan`.
- Lịch sử đổi title thành `Lịch sử mượn` và dùng table style theo mockup.
- Bug ảnh ở MyLoans:
  - Book detail/trang chủ hiển thị đúng ảnh `Bộ công cụ tư duy phản biện`, nhưng MyLoans từng hiển thị fallback khác.
  - Nguyên nhân: response `/loans/me` của server đang chạy có thể thiếu `book.coverImage`, dù source backend đã bổ sung trường này.
  - Fix frontend: nếu `loan.book.coverImage` thiếu, MyLoans gọi thêm catalog API theo `bookId` để lấy canonical `coverImage`, tránh lệch ảnh giữa trang chủ, chi tiết và khoản mượn.
  - Cần restart backend để server đang chạy nhận code mới và trả `coverImage` trực tiếp trong `/loans/me`.

### Reader auth/toast

- Auth UI reader đã được polish theo hướng splash/profile cards tốt hơn.
- Toast reader được chỉnh lại theo hướng motion/polish, phù hợp yêu cầu hiệu ứng mượt hơn.

### Files thay đổi chính trong worktree hiện tại

- Admin:
  - `client/admin/src/App.tsx`
  - `client/admin/src/components/BookCoverArt.tsx`
  - `client/admin/src/pages/Auth/Login.tsx`
  - `client/admin/src/pages/Catalog/CSVImport.tsx`
  - `client/admin/src/pages/Dashboard/index.tsx`
- Reader layout/components:
  - `client/reader/src/components/Toast.tsx`
  - `client/reader/src/components/auth/AuthCard.tsx`
  - `client/reader/src/components/book/BookCard.tsx`
  - `client/reader/src/components/book/BookCover.tsx`
  - `client/reader/src/components/layout/Brand.tsx`
  - `client/reader/src/components/layout/NavMenu.tsx`
  - `client/reader/src/components/layout/ReaderHeader.tsx`
  - `client/reader/src/layouts/AuthBackground.tsx`
  - `client/reader/src/layouts/AuthLayout.tsx`
  - `client/reader/src/styles.css`
- Reader pages:
  - `client/reader/src/pages/Home/index.tsx`
  - `client/reader/src/pages/Home/sections/BookShelves.tsx`
  - `client/reader/src/pages/Home/sections/HeroSearch.tsx`
  - `client/reader/src/pages/Home/sections/QuickStats.tsx`
  - `client/reader/src/pages/Home/sections/RecentActivity.tsx`
  - `client/reader/src/pages/BookDetail/index.tsx`
  - `client/reader/src/pages/BookDetail/sections/AvailabilityCard.tsx`
  - `client/reader/src/pages/BookDetail/sections/BookHero.tsx`
  - `client/reader/src/pages/BookDetail/sections/BookSidebar.tsx`
  - `client/reader/src/pages/BookDetail/sections/CopiesTable.tsx`
  - `client/reader/src/pages/BookDetail/sections/RelatedBooks.tsx`
  - `client/reader/src/pages/Search/index.tsx`
  - `client/reader/src/pages/Search/sections/SearchFilters.tsx`
  - `client/reader/src/pages/Search/sections/SearchResults.tsx`
  - `client/reader/src/pages/MyLoans/index.tsx`
  - `client/reader/src/pages/MyReservations/index.tsx`
- Backend/shared:
  - `server/src/scripts/seed.ts`
  - `server/src/modules/catalog/catalog.service.ts`
  - `server/src/modules/catalog/catalog.types.ts`
  - `server/src/modules/catalog/catalog.validator.ts`
  - `server/src/modules/loan/loan.repository.ts`
  - `server/src/modules/loan/loan.service.ts`
  - `server/src/modules/loan/loan.types.ts`
  - `server/src/modules/reservation/reservation.service.ts`
  - `server/src/modules/reservation/reservation.types.ts`
  - `server/src/modules/bookHold/bookHold.service.ts`
  - `server/src/modules/bookHold/bookHold.types.ts`
  - `server/src/modules/fine/fine.service.ts`
  - `server/src/modules/fine/fine.types.ts`
  - `server/src/modules/report/report.repository.ts`
  - `server/src/modules/report/report.types.ts`
  - `shared/src/bookVisuals.ts`
  - `shared/src/models.ts`
- Tests:
  - `client/reader/src/__tests__/MyLoans.test.tsx`
  - `server/tests/integration/report.test.ts`
  - `server/tests/unit/loan.service.test.ts`

### Verification đã chạy gần nhất

- `npm run typecheck:reader`
- `npm run test:run --workspace @libero/reader -- BookDetail`
- `npm run test:run --workspace @libero/reader -- MyLoans`
- `npm run build:reader`

Ghi chú: `npm run build:reader` pass nhưng Vite vẫn cảnh báo chunk lớn hơn 500kB. Đây là warning bundle size, không phải lỗi compile.

### Việc còn lại nên làm tiếp

- Restart backend dev server để các thay đổi `coverImage` trong loan/reservation/bookHold/fine/report response có hiệu lực.
- Kiểm tra lại MyReservations vì file này vẫn đang có thay đổi liên quan cover image và có thể cần cùng cơ chế fallback catalog như MyLoans.
- Tiếp tục redesign các trang reader còn lại theo thứ tự: `Đặt chỗ`, `Tiền phạt`, `Hồ sơ`.
- Hoàn thiện notification admin theo cụm đã chốt.
- Kiểm thử e2e thủ công một vòng đầy đủ bằng dữ liệu đang có, không chạy `seed:reset-demo` nếu muốn giữ dữ liệu test tay.
- Trước khi commit, cần review lại toàn bộ dirty worktree vì hiện có khoảng 51 file thay đổi.
