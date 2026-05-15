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
