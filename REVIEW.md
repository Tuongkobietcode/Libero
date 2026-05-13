# LIBERO — Review luồng nghiệp vụ vs SRS/SDD

> Ngày review: 2026-05-08
> Phạm vi: toàn bộ `server/`, `client/admin/`, `client/reader/`, đối chiếu với `SRS.md` v1.0 và `SDD.md` v1.0.
> Mục tiêu: liệt kê các gap còn thiếu để triển khai bổ sung.

---

## 1. Tổng quan trạng thái

### Domain đã hoàn thiện đầy đủ ✅

| Domain | Mức độ |
|---|---|
| **Catalog** (CAT-01 → CAT-06) | CRUD Book/BookCopy, search/facets/popular/recommendations, categories, soft-delete có guard chặn khi còn `borrowed` + `WAITING reservation`, CSV import. |
| **Loan** (LOAN-01 → LOAN-06) | Checkout, return (id + barcode), renew, mark-lost, history, policy snapshot, validate `maxBooks`/`isBlocked`/duplicate-book, hold-to-fulfilled khi reserved. |
| **Reservation** (RES-01 → RES-06) | Create (member + librarian "for-member"), list, cancel có decrement `queuePosition`, notify-next sau return, hold-expiry job, chặn renew khi có WAITING. |
| **Fine** (FINE-01 → FINE-05) | Cron tính phạt idempotent `(loanId, overdueDate)`, pay nhiều record, waive, auto block/unblock, fine-rates config. |
| **Notification** | 7 templates Handlebars + cron jobs (due/overdue/hold reminder/expiry, email sender), in-app notification log + mark read. |
| **Report** | Đủ 6 báo cáo (loans summary, overdue, popular, inventory, fines summary, export Excel/PDF). |
| **Auth & Member** | Login/refresh/logout/register, brute-force `failedLoginCount`+`lockedUntil`, JWT rotation, RBAC, suspend/activate, profile, stats, activities, loan-policies admin, fine-rates admin. |
| **Audit log** | `writeAuditLog` được gọi đầy đủ ở 5/5 module có ghi (catalog, member, loan, reservation, fine). |

### Tham chiếu nguồn

- Backend modules: `server/src/modules/{catalog,member,loan,reservation,fine,notification,report,config}/`
- Jobs: `server/src/jobs/` (overdueMarker, fineCalculation, holdExpiry, dueReminder, overdueReminder, holdReminder, emailSender)
- Templates: `server/src/modules/notification/templates/*.hbs`
- Admin pages: `client/admin/src/pages/{Auth,Catalog,Circulation,Members,Reservations,Fines,Reports,Settings,Dashboard}/`
- Reader pages: `client/reader/src/pages/{Home,Search,BookDetail,MyLoans,MyReservations,MyFines,Profile,Login,Register}/`

---

## 2. Các gap so với SRS/SDD ⚠️

### GAP-01 — Đăng ký online thiếu xác thực email

**Tham chiếu SRS:** UC-MEM-01 luồng "Đăng ký online" bước 4 — "tạo Member với status = `pending`; gửi email xác thực. Sau khi xác thực email, Thủ thư nhận thông báo phê duyệt".

**Hiện trạng:**
- `server/src/modules/member/auth.service.ts` hàm `register()`: tạo member `MemberStatus.Pending` rồi trả về luôn, **không sinh verification token, không gửi email**.
- Không có endpoint `POST /auth/verify-email`.
- `Member.model.ts` không có field `emailVerified` / `emailVerificationToken` / `emailVerificationExpiresAt`.

**Cần làm:**
1. Thêm field vào `Member.model.ts`: `emailVerified: boolean (default false)`, `emailVerificationTokenHash: string | null`, `emailVerificationExpiresAt: Date | null`.
2. `auth.service.register()` sinh token (random 32 bytes hex), hash trước khi lưu, set `expiresAt = now + 24h`.
3. Gọi `notificationService.enqueueEmail` với template mới `email_verification.hbs` (link `${FRONTEND_URL}/verify-email?token=...`).
4. Thêm endpoint `POST /api/v1/auth/verify-email` body `{ token }`: tìm member theo token hash, kiểm tra hạn, set `emailVerified = true`, xoá token. **Status vẫn là `pending`** — chờ librarian duyệt.
5. Sau khi verify thành công, gửi email cho librarian (hoặc tạo in-app notification cho role `librarian` + `admin`) báo có member chờ duyệt.
6. Block re-send: thêm `POST /auth/resend-verification` (rate-limited).
7. Tạo trang Reader `/verify-email` xử lý token và hiển thị kết quả.

---

### GAP-02 — Welcome email + mật khẩu tạm thời khi librarian tạo member

**Tham chiếu SRS:** UC-MEM-01 luồng "Thủ thư tạo trực tiếp" bước 6 — "sinh password tạm thời, gửi email chào mừng kèm thông tin đăng nhập".

**Hiện trạng:**
- `member.service.ts` hàm `createMember()` (dòng ~82): nhận `input.password` trực tiếp từ form admin, hash rồi lưu, **không sinh tạm + không gửi email**.
- Không có template `welcome.hbs`.
- Không có cờ `mustChangePassword` để buộc đổi mật khẩu lần đầu.

**Cần làm:**
1. Thêm field `mustChangePassword: boolean (default false)` vào `Member.model.ts`.
2. Sửa `CreateManagedMemberDto` & `member.validator.ts`: `password` thành **optional**. Nếu admin không điền, backend tự sinh ngẫu nhiên (12 ký tự, có chữ hoa + số + ký tự đặc biệt) — dùng `crypto.randomBytes` + ánh xạ charset.
3. Khi backend tự sinh, set `mustChangePassword = true`.
4. Tạo template `welcome.hbs` chứa: tên, email, memberCardNo, mật khẩu tạm thời (hiển thị plaintext 1 lần qua email), link đăng nhập, lưu ý đổi mật khẩu lần đầu.
5. Gọi `notificationService.enqueueEmail` sau khi `createMember` commit thành công.
6. Sửa middleware/login hoặc controller `getMyProfile`: nếu `mustChangePassword === true` → frontend redirect đến trang đổi mật khẩu (yêu cầu GAP-03).
7. UI Admin `MemberForm.tsx`: cho phép **để trống** ô password, hiện hint "Nếu bỏ trống, hệ thống tự sinh và gửi email cho member".

---

### GAP-03 — Đổi mật khẩu

**Tham chiếu SRS:** Phi chức năng bảo mật mục 11; nút "Đổi mật khẩu" hiện đã hiện trên UI Reader.

**Hiện trạng:**
- `client/reader/src/pages/Profile/index.tsx` dòng 358: nút **"Đổi mật khẩu"** nhưng không có `onClick`, không có modal.
- Backend không có endpoint nào cho đổi mật khẩu khi đã đăng nhập.

**Cần làm:**
1. Thêm endpoint `POST /api/v1/auth/change-password` (auth required) body `{ currentPassword, newPassword }`.
2. `auth.service.changePassword()`: verify currentPassword, validate newPassword đủ mạnh (≥ 8, có chữ hoa + số), bcrypt hash, update `passwordHash` + `passwordUpdatedAt = now`, set `mustChangePassword = false`.
3. **Revoke toàn bộ refresh token** của member (buộc đăng nhập lại trên các thiết bị khác). Issue cặp token mới cho session hiện tại.
4. Audit log `CHANGE_PASSWORD`.
5. Validator Zod: regex strong password.
6. UI Reader: tạo modal `ChangePasswordModal` ở `Profile/index.tsx` với 3 ô (current, new, confirm). Bind nút sẵn có. Sau khi đổi thành công → toast + có thể logout-relogin tuỳ UX.
7. UI Admin: thêm tương tự ở topbar/profile menu (nếu có) hoặc trang `Profile` riêng cho admin.
8. Nếu `mustChangePassword = true` (xem GAP-02): chặn user truy cập các trang khác cho đến khi đổi mật khẩu.

---

### GAP-04 — Quên mật khẩu / Reset password

**Tham chiếu SRS:** UC-MEM-02 luồng phụ "Email đã tồn tại → gợi ý khôi phục mật khẩu".

**Hiện trạng:** Không có endpoint, không có UI, không có template.

**Cần làm:**
1. `Member.model.ts`: thêm `passwordResetTokenHash`, `passwordResetExpiresAt`.
2. Endpoint `POST /api/v1/auth/forgot-password` body `{ email }`: luôn trả 200 (tránh email enumeration). Nếu member tồn tại + active → sinh token (32 bytes), hash, lưu, expiry 1h, gửi email template `password_reset.hbs` (link `${FRONTEND_URL}/reset-password?token=...`).
3. Endpoint `POST /api/v1/auth/reset-password` body `{ token, newPassword }`: verify token + expiry, set passwordHash mới, xoá token, **revoke all refresh tokens** của member.
4. Rate limit cho cả 2 endpoint (Redis store, key theo email + IP).
5. UI Login (Reader & Admin): thêm link "Quên mật khẩu?" → trang `/forgot-password` (nhập email).
6. UI Reader: trang `/reset-password` đọc token từ query, hiển thị form 2 ô password.
7. Audit log `FORGOT_PASSWORD_REQUEST` + `RESET_PASSWORD`.

---

### GAP-05 — Approve pending registration trong UI Admin

**Tham chiếu SRS:** UC-MEM-01 bước 6 (online) — "Thủ thư xét duyệt → status chuyển sang `active`".

**Hiện trạng:**
- Endpoint `PATCH /members/:id/activate` đã có và hoạt động.
- Cần kiểm tra `MemberList.tsx`: có filter rõ ràng theo `status=pending` không, và có badge/section riêng cho members chờ duyệt không.
- Khi activate member đang `pending` (lần đầu duyệt), **không gửi email "tài khoản đã được kích hoạt"** dành cho luồng đăng ký mới (template `account_activated.hbs` hiện chỉ phù hợp cho unsuspend).

**Cần làm:**
1. Kiểm tra `client/admin/src/pages/Members/MemberList.tsx` — đảm bảo có filter `status` chứa option "Chờ duyệt", và có thể có 1 widget/badge ở Dashboard "X member chờ duyệt".
2. Trong `member.service.activateMember()`: phân biệt 2 nhánh:
   - Nếu trước đó là `Pending` → gửi email template mới `account_approved.hbs` (chào mừng vào thư viện).
   - Nếu trước đó là `Suspended` → giữ template hiện tại `account_activated.hbs`.
3. Audit log với action khác nhau: `APPROVE_MEMBER` vs `UNSUSPEND_MEMBER`.
4. Bổ sung endpoint `PATCH /members/:id/reject` (set status `rejected` hoặc xoá) — tuỳ chính sách.

---

### GAP-06 — Cấu hình ngưỡng block phạt qua UI Settings

**Tham chiếu SRS:** BR-FINE — ngưỡng block mặc định 50.000đ, "ngưỡng cấu hình".

**Hiện trạng:**
- Ngưỡng được hard-code qua `env`/constant trong `memberBlock.ts`. Không có UI.
- Settings hiện chỉ có `LoanPolicies` và `FineRates`.

**Cần làm:**
1. Tạo collection mới `systemConfigs` (key-value) hoặc dùng `loanPolicies` mở rộng. Đề xuất: collection `systemConfigs` với schema `{ key, value, updatedBy, updatedAt }`.
2. Seed default `{ key: 'fine.blockThreshold', value: 50000 }`.
3. Endpoint `GET /api/v1/config/system` + `PATCH /api/v1/config/system/:key` (role admin).
4. `recalculateMemberBlock` đọc ngưỡng từ DB (cache 60s qua Redis).
5. UI Admin `Settings/SystemConfig.tsx` (hoặc tích hợp vào trang Settings sẵn có).

---

### GAP-07 — Audit log viewer cho admin

**Tham chiếu SRS:** Phi chức năng mục 11.4 — bảo mật dữ liệu (truy vết).

**Hiện trạng:**
- Model `AuditLog` được ghi đầy đủ.
- Không có route `GET /audit-logs` để admin xem.
- Không có UI.

**Cần làm:**
1. Tạo module mới `server/src/modules/audit/` với `audit.routes.ts`, `audit.controller.ts`, `audit.service.ts`, `audit.repository.ts`.
2. Endpoint `GET /api/v1/audit-logs` (role admin) với filter: `actorId`, `entity`, `entityId`, `action`, `dateRange`, pagination.
3. UI Admin trang `/admin/audit-logs` với DataTable: thời gian, actor (email + role), action, entity, entityId, before/after (collapsed JSON).
4. Mount route trong `app.ts`.

---

### GAP-08 — In-app notification cho librarian khi có pending member

**Tham chiếu SRS:** UC-MEM-01 bước "Thủ thư nhận thông báo phê duyệt".

**Hiện trạng:** Không có cơ chế. NotificationLog hiện chỉ ghi cho member đăng ký.

**Cần làm:**
1. Sau khi member verify email thành công (xem GAP-01), gọi `enqueueInAppNotification` cho mọi member có role `librarian` + `admin`.
2. Hoặc: thêm widget ở Dashboard Admin "X member chờ duyệt" (đơn giản hơn — chỉ cần count query).

---

### GAP-09 — Trạng thái `HOLD` trong Reservation state machine

**Tham chiếu SRS:** State machine `WAITING → NOTIFIED → HOLD → FULFILLED/EXPIRED`.

**Hiện trạng:** Code chỉ dùng `Notified` rồi nhảy thẳng `Fulfilled`/`Expired`, **không có `HOLD`**.

**Cần làm:** Quyết định theo 1 trong 2 hướng:
- **Hướng A — Cập nhật SRS** (đề xuất): bỏ trạng thái `HOLD` khỏi state machine, vì hiện tại `NOTIFIED` đã đủ ngữ nghĩa "đã giữ chỗ + chờ member đến nhận trong 48h".
- **Hướng B — Thêm `HOLD`**: thêm endpoint `POST /reservations/:id/confirm-hold` để member xác nhận sẽ đến nhận, chuyển `NOTIFIED → HOLD` (gia hạn holdExpiry thêm 24h chẳng hạn). Phức tạp hơn, hiệu quả nghiệp vụ thấp.

**Khuyến nghị:** Chọn Hướng A — sửa SRS để khớp code.

---

### GAP-10 — Template `account_expired` và xử lý expiry tự động

**Tham chiếu SRS:** UC-MEM-02 luồng 4b — "Status = `expired` → trả lỗi 'Tài khoản đã hết hạn'".

**Hiện trạng:**
- Login đã chặn `expired` qua `assertCanAuthenticateWithMemberStatus`.
- Không có cron job tự động set `status = expired` khi `expiryDate < now`.
- Không có template email cảnh báo sắp hết hạn.

**Cần làm:**
1. Tạo cron job mới `memberExpiryMarker.job.ts` chạy daily 00:10:
   - Member có `expiryDate < now` và `status = active` → set `status = expired`, audit log, gửi email.
   - Member có `expiryDate` trong 7 ngày tới → gửi email reminder.
2. Templates `account_expired.hbs` + `account_expiry_reminder.hbs`.
3. Đăng ký vào `jobs/index.ts`.

---

### GAP-11 — Một số chi tiết nhỏ

1. **`account_blocked.hbs`** đang dùng cho cả "suspend" lẫn "auto-block do phạt" — kiểm tra context truyền vào để hiển thị nội dung phù hợp; nếu khác biệt lớn nên tách 2 template `account_suspended.hbs` và `account_auto_blocked.hbs`.
2. **Email khi librarian huỷ reservation thay member** — hiện chỉ huỷ silently. Cân nhắc gửi email "Reservation của bạn đã bị huỷ bởi thủ thư".
3. **CAT-06 (Import CSV)** SRS đánh `🔲 Planned` nhưng đã code đầy đủ → **cập nhật SRS thành `✅ Active`**.
4. **MEM-04 (Cấu hình policy)** SRS đánh `🔲 Planned` nhưng đã code → cập nhật SRS.
5. **FINE-04 (Waive)** SRS đánh `🔲 Planned` nhưng đã code → cập nhật SRS.
6. **RPT-03/05/06** tương tự — đã code, cập nhật SRS.

---

## 3. Thứ tự ưu tiên triển khai

| # | Hạng mục | Ưu tiên | Effort | Ảnh hưởng UX |
|---|---|---|---|---|
| 1 | **GAP-03** Đổi mật khẩu | 🔴 Cao | Thấp | Cao (đã có nút trên UI) |
| 2 | **GAP-02** Welcome email + temp password | 🔴 Cao | Thấp | Trung |
| 3 | **GAP-01** Email verification flow | 🔴 Cao | Trung | Cao (chặn registration spam) |
| 4 | **GAP-04** Forgot/Reset password | 🟠 Trung | Trung | Cao |
| 5 | **GAP-05** Approve pending UI + email | 🟠 Trung | Thấp | Trung |
| 6 | **GAP-10** Member expiry job + email | 🟠 Trung | Thấp | Trung |
| 7 | **GAP-06** Cấu hình ngưỡng block | 🟡 Thấp | Thấp | Thấp |
| 8 | **GAP-07** Audit log viewer | 🟡 Thấp | Trung | Thấp |
| 9 | **GAP-09** Bỏ trạng thái HOLD trong SRS | 🟡 Thấp | Rất thấp | Không |
| 10 | **GAP-11** Cập nhật trạng thái SRS / tách templates | 🟡 Thấp | Rất thấp | Không |

---

## 4. Hướng dẫn cho người thực thi

1. **Mỗi GAP làm thành 1 PR / commit riêng** với prefix `feat(gap-XX):` để dễ review và rollback.
2. **Test trước khi commit:**
   - Backend: thêm test integration ở `server/tests/integration/` cho mọi endpoint mới.
   - Backend: thêm test unit ở `server/tests/unit/` cho service logic.
   - Frontend: test render + interaction cho modal/page mới ở `client/{admin,reader}/src/__tests__/`.
3. **Tuân thủ kiến trúc** đã có: route → controller → service → repository → model. Validator Zod ở `*.validator.ts`. Error qua `AppError` + `ERR.*` codes.
4. **Email:** mọi template mới đặt ở `server/src/modules/notification/templates/*.hbs`, đăng ký method mới trong `notification.service.ts` (theo pattern `enqueueXxx`).
5. **Audit log:** mọi thay đổi state quan trọng phải gọi `writeAuditLog`.
6. **Migration:** field mới trên Member → cập nhật `seed.ts` để giữ data seed nhất quán.
7. **i18n:** UI dùng tiếng Việt (theo các page hiện có).
8. **Sau khi xong từng GAP**, cập nhật `SRS.md` cột "Trạng thái" tương ứng.

---

## 5. Files chính cần đụng đến

### GAP-01 (Email verification)
- `server/src/models/Member.model.ts`
- `server/src/modules/member/auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `auth.validator.ts`, `auth.types.ts`
- `server/src/modules/notification/notification.service.ts` + template mới
- `client/reader/src/pages/VerifyEmail/` (tạo mới) + route

### GAP-02 (Welcome + temp password)
- `server/src/models/Member.model.ts` (thêm `mustChangePassword`)
- `server/src/modules/member/member.service.ts`, `member.validator.ts`, `member.types.ts`
- `server/src/common/utils/passwordGenerator.ts` (tạo mới)
- Template `welcome.hbs`
- `client/admin/src/pages/Members/MemberForm.tsx`

### GAP-03 (Change password)
- `server/src/modules/member/auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `auth.validator.ts`
- `client/reader/src/pages/Profile/index.tsx` + component `ChangePasswordModal.tsx`
- `client/admin/src/...` (profile/topbar tương ứng)

### GAP-04 (Forgot/Reset password)
- Tương tự GAP-01 + 2 template + 2 page Reader (`/forgot-password`, `/reset-password`)
- Link "Quên mật khẩu?" trong cả 2 trang Login

### GAP-05 (Approve workflow)
- `server/src/modules/member/member.service.ts` (rẽ nhánh trong `activateMember`)
- Template mới `account_approved.hbs`
- `client/admin/src/pages/Members/MemberList.tsx` + `MemberDetail.tsx`

### GAP-06 (Config threshold)
- `server/src/models/SystemConfig.model.ts` (mới)
- `server/src/modules/config/` (mở rộng)
- `server/src/common/utils/memberBlock.ts`
- UI Settings

### GAP-07 (Audit viewer)
- `server/src/modules/audit/` (mới)
- `client/admin/src/pages/AuditLogs/` (mới)

### GAP-10 (Member expiry)
- `server/src/jobs/memberExpiryMarker.job.ts` (mới)
- `server/src/jobs/index.ts`
- `server/src/config/queue.ts` (thêm queue name)
- 2 templates mới
