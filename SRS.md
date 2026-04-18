# HỆ THỐNG QUẢN LÝ THƯ VIỆN TRƯỜNG HỌC

*Software Requirements Specification (SRS)*

|                        |                                     |
|------------------------|-------------------------------------|
| **Phiên bản**          | 1.0                                 |
| **Ngày tạo**           | 14/4/2026                           |
| **Loại hệ thống**      | Thư viện trường học / đại học       |
| **Mô hình triển khai** | Web Application — Node.js / Express |
| **Trạng thái**         | Draft — Chờ phê duyệt               |

## Mục lục

1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
   - 1.1 Giới Thiệu
   - 1.2 Phạm Vi Hệ Thống
   - 1.3 Định Nghĩa & Thuật Ngữ
2. [Stakeholders & Actors](#2-stakeholders--actors)
   - 2.1 Danh Sách Actor
3. [Domain & Chức Năng Core](#3-domain--chức-năng-core)
   - 3.1 Domain: Catalog
     - 3.1.1 Entities chính
     - 3.1.2 Yêu cầu chức năng
     - 3.1.3 Use Case Chi Tiết — Catalog
   - 3.2 Domain: Member
     - 3.2.1 Entities chính
     - 3.2.2 LoanPolicy mặc định
     - 3.2.3 Yêu cầu chức năng
     - 3.2.4 Use Case Chi Tiết — Member
   - 3.3 Domain: Loan
     - 3.3.1 Entities chính
     - 3.3.2 State Machine — LoanRecord
     - 3.3.3 Yêu cầu chức năng
     - 3.3.4 Use Case Chi Tiết — Loan
   - 3.4 Domain: Reservation
     - 3.4.1 Entities chính
     - 3.4.2 Luồng xử lý Reservation Queue
     - 3.4.3 Yêu cầu chức năng
     - 3.4.4 Use Case Chi Tiết — Reservation
   - 3.5 Domain: Fine
     - 3.5.1 Entities chính
     - 3.5.2 Logic tính phạt
     - 3.5.3 Yêu cầu chức năng
     - 3.5.4 Use Case Chi Tiết — Fine
   - 3.6 Domain: Notification
     - 3.6.1 Danh sách sự kiện thông báo
     - 3.6.2 Use Case Chi Tiết — Notification
   - 3.7 Domain: Report
     - 3.7.1 Use Case Chi Tiết — Report
4. [Yêu Cầu Phi Chức Năng](#4-yêu-cầu-phi-chức-năng)
5. [Kiến Trúc & Tech Stack](#5-kiến-trúc--tech-stack)
   - 5.1 Kiến Trúc Tổng Quan
   - 5.2 Cấu Trúc Thư Mục (Đề xuất)
6. [Data Model — Quan Hệ Chính](#6-data-model--quan-hệ-chính)
7. [API Endpoints — Tổng Hợp](#7-api-endpoints--tổng-hợp)
8. [Lộ Trình Triển Khai](#8-lộ-trình-triển-khai)
9. [Rủi Ro & Giải Pháp](#9-rủi-ro--giải-pháp)
10. [Business Rules](#10-business-rules)
    - 10.1 Quy tắc Catalog
    - 10.2 Quy tắc Member
    - 10.3 Quy tắc Loan
    - 10.4 Quy tắc Reservation
    - 10.5 Quy tắc Fine
    - 10.6 Quy tắc Notification
11. [Yêu Cầu Bảo Mật Chi Tiết](#11-yêu-cầu-bảo-mật-chi-tiết)
    - 11.1 Xác thực (Authentication)
    - 11.2 Phân quyền (Authorization) — RBAC Matrix
    - 11.3 Bảo mật API
    - 11.4 Bảo mật Dữ liệu
12. [Error Handling & Error Codes](#12-error-handling--error-codes)
    - 12.1 Chuẩn Error Response
    - 12.2 Danh sách Error Codes theo Module
13. [Giao Diện Người Dùng — Mô Tả Layout](#13-giao-diện-người-dùng--mô-tả-layout)
    - 13.1 Nguyên tắc thiết kế chung
    - 13.2 Các màn hình chính — Giao diện Thủ thư
    - 13.3 Các màn hình chính — Giao diện Độc giả
14. [Constraints & Assumptions](#14-constraints--assumptions-ràng-buộc--giả-định)
    - 14.1 Giả định (Assumptions)
    - 14.2 Ràng buộc (Constraints)
15. [Acceptance Criteria](#15-acceptance-criteria-tiêu-chí-nghiệm-thu)
    - 15.1 Catalog
    - 15.2 Member & Auth
    - 15.3 Loan
    - 15.4 Reservation
    - 15.5 Fine
    - 15.6 Notification
    - 15.7 Report
16. [Lịch Sử Phiên Bản](#16-lịch-sử-phiên-bản-revision-history)

## 1. Tổng Quan Dự Án

### 1.1 Giới Thiệu

Tài liệu này mô tả đầy đủ các yêu cầu phần mềm (Software Requirements Specification) cho hệ thống quản lý thư viện trường học. Hệ thống hỗ trợ hai nhóm người dùng chính — Thủ thư và Độc giả — với các chức năng cốt lõi gồm quản lý danh mục sách, mượn/trả, đặt trước, xử lý phạt quá hạn và báo cáo thống kê.

### 1.2 Phạm Vi Hệ Thống

Hệ thống bao gồm:

- Quản lý danh mục sách và bản sao vật lý (BookCopy)
- Quản lý thành viên: sinh viên, giảng viên, thủ thư
- Quy trình mượn và trả sách với loan policy theo role
- Hàng chờ đặt trước (Reservation Queue) với cơ chế hold tự động
- Tính phạt quá hạn tự động và xử lý thanh toán
- Hệ thống thông báo nhắc nhở qua email
- Báo cáo thống kê cho ban quản lý

Ngoài phạm vi (Out of scope):

- Ebook / tài nguyên số
- Thanh toán online (phạt nộp trực tiếp tại quầy)
- Quản lý nhiều chi nhánh

### 1.3 Định Nghĩa & Thuật Ngữ

|                 |                                                                                                 |
|-----------------|-------------------------------------------------------------------------------------------------|
| **Thuật ngữ**   | **Định nghĩa**                                                                                  |
| **Book**        | Đầu sách — thực thể logic, không mang tính vật lý, mô tả bởi ISBN, tên, tác giả, thể loại       |
| **BookCopy**    | Bản sao vật lý của một Book; có mã barcode riêng, tình trạng và vị trí kệ                       |
| **LoanRecord**  | Bản ghi mượn sách — gắn một BookCopy với một Member trong khoảng thời gian xác định             |
| **DueDate**     | Ngày hạn trả sách được xác định bởi LoanPolicy tương ứng với role của Member                    |
| **LoanPolicy**  | Chính sách mượn: số sách tối đa, thời hạn mượn, số lần gia hạn cho từng role                    |
| **Reservation** | Yêu cầu đặt trước một đầu sách khi toàn bộ bản sao đang được mượn                               |
| **Hold**        | Trạng thái giữ bản sao cho người đặt trước sau khi sách được trả; có thời hạn (HoldExpiry)      |
| **FineRecord**  | Bản ghi phạt cho một ngày quá hạn; idempotent — mỗi (LoanRecord, overdue_date) chỉ có 1 bản ghi |
| **FineRate**    | Đơn giá phạt mỗi ngày quá hạn, cấu hình theo loại sách hoặc áp dụng chung                       |
| **Soft delete** | Đánh dấu is_deleted = true thay vì xoá cứng; giữ nguyên lịch sử loan, fine                      |

## 2. Stakeholders & Actors

### 2.1 Danh Sách Actor

|                    |                    |                                                                                  |
|--------------------|--------------------|----------------------------------------------------------------------------------|
| **Actor**          | **Loại**           | **Mô tả**                                                                        |
| **Thủ thư**        | Người dùng chính   | Quản lý toàn bộ catalog, thành viên, giao dịch mượn/trả, xử lý phạt, xem báo cáo |
| **Sinh viên**      | Người dùng chính   | Tìm kiếm sách, xem lịch sử, đặt trước, xem phạt. Tối đa 3 sách / 14 ngày         |
| **Giảng viên**     | Người dùng chính   | Quyền tra cứu giống sinh viên. LoanPolicy ưu tiên hơn: 5 sách / 30 ngày          |
| **Admin hệ thống** | Người dùng phụ     | Cấu hình LoanPolicy, FineRate, quản lý tài khoản thủ thư                         |
| **Cron Job**       | Hệ thống tự động   | Chạy hàng ngày: tính phạt, kiểm tra hold hết hạn, gửi thông báo nhắc nhở         |
| **Email Service**  | Hệ thống bên ngoài | Nhận yêu cầu từ Notification module, gửi email cho độc giả                       |

## 3. Domain & Chức Năng Core

### 3.1 Domain: Catalog

Quản lý toàn bộ đầu sách và bản sao vật lý trong thư viện.

#### 3.1.1 Entities chính

- Book: isbn (unique), title, author\[\], category, publisher, publishYear, description, coverImage, is_deleted
- BookCopy: copyId, bookId (FK), barcode (unique), status \[available \| borrowed \| reserved \| damaged \| lost\], shelfLocation, acquiredDate
- Author: authorId, name, bio
- Category: categoryId, name, parentId (hỗ trợ phân cấp)

#### 3.1.2 Yêu cầu chức năng

|            |                            |                                                                                            |                 |          |                |
|------------|----------------------------|--------------------------------------------------------------------------------------------|-----------------|----------|----------------|
| **ID**     | **Tên**                    | **Mô tả**                                                                                  | **Ưu tiên**     | **Role** | **Trạng thái** |
| **CAT-01** | **Thêm đầu sách**          | Thủ thư nhập thông tin Book + số lượng bản sao; hệ thống tự sinh barcode cho từng BookCopy | **Must have**   | Thủ thư  | ✅ Active      |
| **CAT-02** | **Tìm kiếm sách**          | Full-text search theo tên, tác giả, ISBN, thể loại; lọc theo tình trạng available/all      | **Must have**   | Tất cả   | ✅ Active      |
| **CAT-03** | **Cập nhật sách**          | Sửa thông tin Book; cập nhật tình trạng / vị trí BookCopy                                  | **Must have**   | Thủ thư  | ✅ Active      |
| **CAT-04** | **Soft delete**            | Ẩn Book khỏi catalog khi is_deleted=true; giữ toàn bộ lịch sử                              | **Must have**   | Thủ thư  | ✅ Active      |
| **CAT-05** | **Xem tình trạng bản sao** | Hiển thị danh sách BookCopy của một Book kèm status, vị trí kệ                             | **Must have**   | Tất cả   | ✅ Active      |
| **CAT-06** | **Import hàng loạt**       | Import danh sách sách qua file CSV; validate ISBN trùng                                    | **Should have** | Thủ thư  | 🔲 Planned     |

#### 3.1.3 Use Case Chi Tiết — Catalog

##### UC–CAT-01: Thêm đầu sách

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập với role `librarian`
- **Postconditions:** Book mới được tạo trong hệ thống; N bản sao BookCopy được sinh tự động với barcode duy nhất; trạng thái mỗi BookCopy = `available`

**Luồng chính (Main Flow):**

1. Thủ thư chọn "Thêm sách mới" trên giao diện quản lý Catalog
2. Hệ thống hiển thị form nhập: ISBN, tiêu đề, tác giả (chọn hoặc tạo mới), thể loại, nhà xuất bản, năm xuất bản, mô tả, ảnh bìa, số lượng bản sao, vị trí kệ mặc định
3. Thủ thư điền thông tin và nhấn "Lưu"
4. Hệ thống validate: ISBN hợp lệ (10 hoặc 13 ký tự), tiêu đề không rỗng, số lượng bản sao ≥ 1
5. Hệ thống kiểm tra ISBN chưa tồn tại trong database
6. Hệ thống tạo bản ghi Book + liên kết Author, Category
7. Hệ thống tự sinh N BookCopy với barcode theo quy tắc: `LIB-{bookId}-{copyIndex}-{checksum}`
8. Hệ thống trả về thông báo thành công kèm danh sách barcode đã sinh

**Luồng thay thế (Alternative Flows):**

- **4a.** Dữ liệu không hợp lệ → Hiển thị lỗi validation cụ thể cho từng trường; giữ nguyên dữ liệu đã nhập
- **5a.** ISBN đã tồn tại → Hệ thống đề xuất "Thêm bản sao cho đầu sách đã có" thay vì tạo mới
- **2a.** Tác giả chưa có trong hệ thống → Thủ thư tạo Author mới inline (tên, tiểu sử) → quay lại luồng chính

**Luồng ngoại lệ (Exception Flows):**

- **E1.** Lỗi kết nối database → Rollback toàn bộ transaction (không tạo Book lẫn BookCopy); hiển thị lỗi hệ thống

---

##### UC–CAT-02: Tìm kiếm sách

- **Actor chính:** Tất cả người dùng (bao gồm khách chưa đăng nhập)
- **Preconditions:** Không yêu cầu
- **Postconditions:** Danh sách kết quả tìm kiếm được hiển thị; hệ thống ghi log truy vấn

**Luồng chính (Main Flow):**

1. Người dùng nhập từ khoá vào ô tìm kiếm (hoặc sử dụng bộ lọc nâng cao)
2. Hệ thống thực hiện full-text search trên các trường: title, author.name, isbn, category.name
3. Hệ thống lọc kết quả: mặc định chỉ hiển thị sách có `is_deleted = false`
4. Kết quả trả về dạng phân trang (20 kết quả/trang), sắp xếp theo relevance score giảm dần
5. Mỗi kết quả hiển thị: ảnh bìa, tên sách, tác giả, thể loại, số bản sao available / tổng

**Luồng thay thế (Alternative Flows):**

- **1a.** Người dùng sử dụng bộ lọc nâng cao: lọc theo thể loại, tác giả, năm xuất bản, tình trạng (available / all)
- **4a.** Không có kết quả nào → Hiển thị thông báo "Không tìm thấy sách phù hợp" + gợi ý từ khoá liên quan
- **1b.** Người dùng tìm bằng ISBN chính xác → Hệ thống redirect thẳng đến trang chi tiết sách

---

##### UC–CAT-03: Cập nhật sách

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; Book tồn tại trong hệ thống
- **Postconditions:** Thông tin Book / BookCopy được cập nhật; audit log ghi nhận thay đổi (before/after)

**Luồng chính (Main Flow):**

1. Thủ thư tìm kiếm và chọn một đầu sách cần sửa
2. Hệ thống hiển thị thông tin hiện tại của Book + danh sách BookCopy
3. Thủ thư chỉnh sửa thông tin Book (tiêu đề, tác giả, thể loại, mô tả…) hoặc cập nhật BookCopy (vị trí kệ, tình trạng)
4. Thủ thư nhấn "Cập nhật"
5. Hệ thống validate dữ liệu mới
6. Hệ thống lưu thay đổi + ghi audit_log (actor, action=UPDATE, entity=Book/BookCopy, before/after values, timestamp)
7. Hiển thị thông báo thành công

**Luồng thay thế (Alternative Flows):**

- **3a.** Thủ thư đánh dấu BookCopy là `damaged` → Hệ thống kiểm tra: nếu copy đang được mượn (status=borrowed) → yêu cầu xử lý trả sách trước
- **3b.** Thủ thư muốn thêm bản sao mới cho Book → Sinh thêm BookCopy với barcode mới

---

##### UC–CAT-04: Soft Delete đầu sách

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; Book tồn tại và chưa bị xoá mềm
- **Postconditions:** Book.is_deleted = true; sách không còn xuất hiện trong kết quả tìm kiếm mặc định; toàn bộ LoanRecord, FineRecord liên quan được giữ nguyên

**Luồng chính (Main Flow):**

1. Thủ thư chọn đầu sách và nhấn "Xoá"
2. Hệ thống kiểm tra: toàn bộ BookCopy của Book phải có status ≠ `borrowed`
3. Hệ thống hiển thị xác nhận: "Xoá đầu sách [Title]? Sách sẽ bị ẩn khỏi danh mục nhưng lịch sử mượn/phạt được giữ nguyên."
4. Thủ thư xác nhận
5. Hệ thống cập nhật `is_deleted = true` cho Book
6. Ghi audit_log; hiển thị thông báo thành công

**Luồng ngoại lệ (Exception Flows):**

- **2a.** Còn BookCopy đang được mượn → Từ chối xoá; hiển thị danh sách các bản sao đang lưu thông + thông tin người mượn
- **2b.** Có Reservation đang WAITING cho Book → Cảnh báo và yêu cầu huỷ reservation trước khi xoá

---

##### UC–CAT-05: Xem tình trạng bản sao

- **Actor chính:** Tất cả người dùng
- **Preconditions:** Book tồn tại và `is_deleted = false` (hoặc Thủ thư có quyền xem cả sách đã xoá)
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Người dùng truy cập trang chi tiết một đầu sách
2. Hệ thống hiển thị thông tin Book: tiêu đề, tác giả, ISBN, thể loại, mô tả, ảnh bìa
3. Phía dưới hiển thị bảng danh sách BookCopy: barcode, status, vị trí kệ, ngày nhập
4. Với mỗi copy đang borrowed: hiển thị ngày hạn trả (dueDate) để người dùng biết khi nào sách sẽ available
5. Hiển thị tổng hợp: X available / Y tổng bản sao

**Luồng thay thế (Alternative Flows):**

- **4a.** Người dùng chưa đăng nhập → Chỉ hiển thị status và dueDate, ẩn thông tin người mượn
- **4b.** Thủ thư → Hiển thị thêm thông tin chi tiết: người mượn, số ngày quá hạn (nếu có)

---

##### UC–CAT-06: Import hàng loạt

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; có file CSV đúng định dạng
- **Postconditions:** Các Book và BookCopy hợp lệ được tạo; các dòng lỗi được báo cáo chi tiết

**Luồng chính (Main Flow):**

1. Thủ thư chọn "Import sách" và upload file CSV
2. Hệ thống validate định dạng file: kiểm tra header (isbn, title, author, category, quantity, shelfLocation)
3. Hệ thống xử lý từng dòng: validate ISBN, kiểm tra trùng, tạo Book + BookCopy
4. Hiển thị kết quả: số sách import thành công, số dòng bị lỗi kèm lý do cụ thể (dòng X: ISBN trùng, dòng Y: thiếu tiêu đề…)
5. Cho phép Thủ thư tải file báo cáo lỗi

**Luồng thay thế (Alternative Flows):**

- **2a.** File không đúng định dạng hoặc thiếu cột bắt buộc → Từ chối toàn bộ; hiển thị template CSV mẫu
- **3a.** ISBN đã tồn tại → Bỏ qua dòng đó, ghi vào báo cáo lỗi; tiếp tục xử lý các dòng còn lại

**Luồng ngoại lệ (Exception Flows):**

- **E1.** File quá lớn (> 10.000 dòng) → Hệ thống xử lý bất đồng bộ; gửi email thông báo khi hoàn tất

---

### 3.2 Domain: Member

Quản lý tài khoản độc giả và phân quyền theo role.

#### 3.2.1 Entities chính

- Member: memberId, fullName, email, phone, studentId/staffId, role \[student \| lecturer \| librarian \| admin\], memberCardNo, status \[active \| suspended \| expired\], joinDate, expiryDate
- LoanPolicy: policyId, role, maxBooks, loanDays, maxRenewals, renewDays

#### 3.2.2 LoanPolicy mặc định

|                |                 |              |                    |                  |
|----------------|-----------------|--------------|--------------------|------------------|
| **Role**       | **Sách tối đa** | **Hạn mượn** | **Số lần gia hạn** | **Ngày gia hạn** |
| **Sinh viên**  | 3 cuốn          | 14 ngày      | 1 lần              | 7 ngày           |
| **Giảng viên** | 5 cuốn          | 30 ngày      | 2 lần              | 14 ngày          |
| **Thủ thư**    | 10 cuốn         | 60 ngày      | Không giới hạn     | 14 ngày          |

#### 3.2.3 Yêu cầu chức năng

|            |                     |                                                                                        |                 |          |                |
|------------|---------------------|----------------------------------------------------------------------------------------|-----------------|----------|----------------|
| **ID**     | **Tên**             | **Mô tả**                                                                              | **Ưu tiên**     | **Role** | **Trạng thái** |
| **MEM-01** | **Tạo tài khoản**   | Thủ thư tạo tài khoản + in thẻ thư viện; sinh viên/GV đăng ký online chờ duyệt         | **Must have**   | Thủ thư  | ✅ Active      |
| **MEM-02** | **Đăng nhập / JWT** | Xác thực bằng email + password; trả về Access Token (15 phút) + Refresh Token (7 ngày) | **Must have**   | Tất cả   | ✅ Active      |
| **MEM-03** | **Khoá tài khoản**  | Thủ thư suspend Member; Member bị khoá không thể mượn mới nhưng vẫn xem lịch sử        | **Must have**   | Thủ thư  | ✅ Active      |
| **MEM-04** | **Cấu hình policy** | Admin chỉnh LoanPolicy theo role; thay đổi áp dụng cho loan mới, không hồi tố          | **Should have** | Admin    | 🔲 Planned     |

#### 3.2.4 Use Case Chi Tiết — Member

##### UC–MEM-01: Tạo tài khoản

- **Actor chính:** Thủ thư (tạo trực tiếp) / Sinh viên, Giảng viên (đăng ký online)
- **Preconditions:** (Thủ thư) đã đăng nhập với role `librarian`; (Sinh viên/GV) truy cập trang đăng ký công khai
- **Postconditions:** Tài khoản Member được tạo với status tương ứng; memberCardNo được sinh tự động

**Luồng chính — Thủ thư tạo trực tiếp:**

1. Thủ thư chọn "Thêm thành viên mới"
2. Hệ thống hiển thị form: họ tên, email, số điện thoại, mã sinh viên / mã nhân viên, role (student / lecturer)
3. Thủ thư điền thông tin và nhấn "Tạo"
4. Hệ thống validate: email hợp lệ + chưa tồn tại, mã SV/NV không trùng, họ tên không rỗng
5. Hệ thống tạo Member với status = `active`, sinh memberCardNo theo quy tắc `MEM-{year}-{sequence}`
6. Hệ thống sinh password tạm thời, gửi email chào mừng kèm thông tin đăng nhập
7. Hiển thị thông tin thẻ thư viện để in (barcode memberCardNo, họ tên, role, ngày hết hạn)

**Luồng chính — Đăng ký online:**

1. Sinh viên/GV truy cập trang đăng ký
2. Điền form: họ tên, email trường, mã SV/NV, password, xác nhận password
3. Hệ thống validate: email thuộc domain trường, mã SV/NV hợp lệ, password đủ mạnh (≥ 8 ký tự, có chữ hoa + số)
4. Hệ thống tạo Member với status = `pending`; gửi email xác thực
5. Sau khi xác thực email, Thủ thư nhận thông báo phê duyệt
6. Thủ thư xét duyệt → status chuyển sang `active`

**Luồng thay thế:**

- **4a.** Email đã tồn tại → Báo lỗi "Email đã được sử dụng"; gợi ý khôi phục mật khẩu
- **3a.** (Online) Password không đủ mạnh → Hiển thị yêu cầu cụ thể + strength meter

**Luồng ngoại lệ:**

- **E1.** Gửi email thất bại → Vẫn tạo tài khoản; ghi log lỗi email; hiển thị thông tin đăng nhập trực tiếp cho Thủ thư

---

##### UC–MEM-02: Đăng nhập / JWT

- **Actor chính:** Tất cả người dùng
- **Preconditions:** Tài khoản tồn tại với status = `active`
- **Postconditions:** Client nhận Access Token (15 phút) + Refresh Token (7 ngày); session được ghi log

**Luồng chính (Main Flow):**

1. Người dùng nhập email và password tại trang đăng nhập
2. Hệ thống kiểm tra email tồn tại trong database
3. Hệ thống so sánh password với hash (bcrypt) trong database
4. Hệ thống kiểm tra member.status = `active`
5. Hệ thống sinh Access Token (JWT, TTL 15 phút, chứa memberId, role) và Refresh Token (opaque token, TTL 7 ngày, lưu trong database)
6. Trả về cả hai token; client lưu Access Token trong memory, Refresh Token trong httpOnly cookie
7. Ghi audit_log: login success, IP, user-agent

**Luồng thay thế:**

- **3a.** Password sai → Tăng failedLoginCount; nếu ≥ 5 lần trong 15 phút → tạm khoá 30 phút; trả lỗi chung "Email hoặc mật khẩu không đúng"
- **4a.** Status = `suspended` → Trả lỗi "Tài khoản đã bị khoá. Vui lòng liên hệ thư viện"
- **4b.** Status = `expired` → Trả lỗi "Tài khoản đã hết hạn. Vui lòng gia hạn tại quầy"
- **4c.** Status = `pending` → Trả lỗi "Tài khoản chờ phê duyệt"

**Refresh Token Flow:**

1. Client gửi Refresh Token khi Access Token hết hạn
2. Hệ thống validate Refresh Token trong database: tồn tại, chưa hết hạn, chưa bị thu hồi
3. Hệ thống sinh Access Token mới + Refresh Token mới (rotation); vô hiệu hoá Refresh Token cũ
4. Trả về cặp token mới

**Luồng ngoại lệ:**

- **E1.** Refresh Token không hợp lệ hoặc đã bị reuse (phát hiện token theft) → Thu hồi toàn bộ Refresh Token của member; buộc đăng nhập lại

---

##### UC–MEM-03: Khoá tài khoản

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; Member mục tiêu tồn tại với status = `active`
- **Postconditions:** Member.status = `suspended`; Member không thể mượn sách mới nhưng vẫn đăng nhập xem lịch sử và phạt

**Luồng chính (Main Flow):**

1. Thủ thư tìm kiếm và chọn Member cần khoá
2. Hệ thống hiển thị thông tin Member: các sách đang mượn, phạt chưa thanh toán
3. Thủ thư nhập lý do khoá và nhấn "Khoá tài khoản"
4. Hệ thống cập nhật member.status = `suspended`, ghi lý do + thời gian + actorId
5. Hệ thống thu hồi toàn bộ Refresh Token của Member (buộc đăng nhập lại)
6. Gửi email thông báo cho Member: lý do khoá + hướng dẫn liên hệ
7. Ghi audit_log

**Luồng thay thế:**

- **2a.** Member đang có sách chưa trả → Hiển thị cảnh báo nhưng vẫn cho phép khoá; sách quá hạn vẫn tiếp tục tính phạt
- **1a.** Mở khoá: Thủ thư chọn Member đang suspended → nhấn "Mở khoá" → status = `active`; gửi email thông báo

---

##### UC–MEM-04: Cấu hình LoanPolicy

- **Actor chính:** Admin hệ thống
- **Preconditions:** Admin đã đăng nhập với role `admin`
- **Postconditions:** LoanPolicy mới được lưu; chỉ áp dụng cho loan mới, không ảnh hưởng loan đang hoạt động

**Luồng chính (Main Flow):**

1. Admin truy cập trang "Cấu hình chính sách mượn"
2. Hệ thống hiển thị bảng LoanPolicy hiện tại của từng role
3. Admin chỉnh sửa: maxBooks, loanDays, maxRenewals, renewDays cho role cần thay đổi
4. Admin nhấn "Lưu thay đổi"
5. Hệ thống validate: maxBooks ≥ 1, loanDays ≥ 1, maxRenewals ≥ 0, renewDays ≥ 1
6. Hệ thống lưu policy mới với effectiveFrom = now; policy cũ giữ nguyên cho reference
7. Ghi audit_log (before/after values)
8. Hiển thị thông báo: "Chính sách mới sẽ áp dụng cho các lần mượn từ bây giờ"

**Luồng thay thế:**

- **5a.** Giá trị không hợp lệ (maxBooks = 0, loanDays âm…) → Hiển thị lỗi validation; giữ giá trị cũ
- **3a.** Admin muốn xem lịch sử thay đổi policy → Hệ thống hiển thị timeline các phiên bản policy trước đó

---

### 3.3 Domain: Loan

Quản lý vòng đời mượn/trả sách từ khi checkout đến khi BookCopy trở về trạng thái available.

#### 3.3.1 Entities chính

- LoanRecord: loanId, memberId (FK), copyId (FK), checkoutDate, dueDate, returnDate, status, renewCount, notes

#### 3.3.2 State Machine — LoanRecord

|                         |                                                             |                          |                  |
|-------------------------|-------------------------------------------------------------|--------------------------|------------------|
| **Trạng thái hiện tại** | **Sự kiện / Điều kiện**                                     | **Trạng thái tiếp theo** | **Actor**        |
| **—**                   | Thủ thư xác nhận checkout                                   | **ACTIVE**               | Thủ thư          |
| **ACTIVE**              | returnDate \<= dueDate                                      | **RETURNED**             | Thủ thư          |
| **ACTIVE**              | returnDate \> dueDate                                       | **RETURNED (overdue)**   | Thủ thư          |
| **ACTIVE**              | Qua DueDate mà chưa trả                                     | **OVERDUE**              | Cron Job         |
| **ACTIVE**              | Member xin gia hạn; renewCount \< max; không có Reservation | **RENEWED**              | Member / Thủ thư |
| **OVERDUE**             | Member nộp sách + thanh toán phạt                           | **RETURNED**             | Thủ thư          |
| **ACTIVE/OVERDUE**      | Sách bị mất / hỏng                                          | **LOST**                 | Thủ thư          |

#### 3.3.3 Yêu cầu chức năng

|             |                       |                                                                                                                                                 |                 |                |                |
|-------------|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|----------------|----------------|
| **ID**      | **Tên**               | **Mô tả**                                                                                                                                       | **Ưu tiên**     | **Role**       | **Trạng thái** |
| **LOAN-01** | **Checkout sách**     | Thủ thư scan barcode; hệ thống kiểm tra: copy available, member không bị block, chưa đạt maxBooks; tạo LoanRecord + set dueDate theo LoanPolicy | **Must have**   | Thủ thư        | ✅ Active      |
| **LOAN-02** | **Trả sách**          | Scan barcode; cập nhật returnDate, status RETURNED; kiểm tra quá hạn → tạo FineRecord nếu cần; giải phóng copy → trigger Reservation queue      | **Must have**   | Thủ thư        | ✅ Active      |
| **LOAN-03** | **Gia hạn sách**      | Cho phép khi renewCount \< max VÀ không có Reservation active cho cùng Book; cộng thêm renewDays vào dueDate                                    | **Must have**   | Member/Thủ thư | ✅ Active      |
| **LOAN-04** | **Xem lịch sử**       | Member xem lịch sử mượn của bản thân; Thủ thư xem lịch sử của bất kỳ member nào                                                                 | **Must have**   | Tất cả         | ✅ Active      |
| **LOAN-05** | **Block mượn mới**    | Khi Member có FineRecord chưa thanh toán vượt ngưỡng (cấu hình) → không cho checkout cho đến khi clear fine                                     | **Must have**   | Cron / Thủ thư | ✅ Active      |
| **LOAN-06** | **Ghi nhận mất sách** | Thủ thư đánh dấu LoanRecord = LOST; BookCopy = lost; tạo FineRecord đặc biệt theo giá trị sách                                                  | **Should have** | Thủ thư        | 🔲 Planned     |

#### 3.3.4 Use Case Chi Tiết — Loan

##### UC–LOAN-01: Checkout sách

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; Member đến quầy với thẻ thư viện
- **Postconditions:** LoanRecord mới được tạo (status = ACTIVE); BookCopy.status = `borrowed`; dueDate được tính theo LoanPolicy

**Luồng chính (Main Flow):**

1. Thủ thư scan hoặc nhập memberCardNo / barcode thẻ thư viện
2. Hệ thống hiển thị thông tin Member: họ tên, role, số sách đang mượn / maxBooks, tổng phạt chưa thanh toán
3. Thủ thư scan barcode của BookCopy cần mượn
4. Hệ thống kiểm tra tuần tự:
   - a. BookCopy tồn tại và status = `available`
   - b. Member.status = `active` (không bị suspended/expired)
   - c. Member.is_blocked = false (không bị block do phạt)
   - d. Số sách đang mượn < maxBooks (theo LoanPolicy của role)
   - e. Member không đang mượn bản sao khác của cùng đầu sách (tuỳ chọn)
5. Hệ thống tạo LoanRecord: checkoutDate = now, dueDate = now + loanDays, status = ACTIVE, renewCount = 0
6. Cập nhật BookCopy.status = `borrowed`
7. Hiển thị phiếu mượn: tên sách, barcode, ngày mượn, ngày hạn trả
8. Gửi email xác nhận checkout cho Member (async)
9. Ghi audit_log

**Luồng thay thế:**

- **4a.** BookCopy.status ≠ `available` → Hiển thị trạng thái hiện tại; nếu `reserved` → kiểm tra hold thuộc về Member hiện tại không
- **4b.** BookCopy đang HOLD cho Member này (có Reservation) → Cho phép checkout; cập nhật Reservation.status = FULFILLED
- **4c.** Member bị block → Hiển thị tổng phạt chưa thanh toán; gợi ý thanh toán trước khi mượn
- **4d.** Đạt maxBooks → Hiển thị danh sách sách đang mượn; gợi ý trả sách trước
- **3a.** Barcode không tìm thấy → Cho phép tìm theo BookId hoặc tên sách → chọn copy available

**Luồng ngoại lệ:**

- **E1.** Lỗi khi tạo LoanRecord → Rollback; BookCopy giữ nguyên `available`; hiển thị lỗi hệ thống

---

##### UC–LOAN-02: Trả sách

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; BookCopy đang được mượn (có LoanRecord ACTIVE hoặc OVERDUE)
- **Postconditions:** LoanRecord.status = RETURNED; BookCopy.status = `available` (hoặc `reserved` nếu có Reservation); FineRecord được tạo nếu quá hạn

**Luồng chính (Main Flow):**

1. Thủ thư scan barcode của BookCopy được trả
2. Hệ thống tìm LoanRecord đang ACTIVE hoặc OVERDUE cho BookCopy này
3. Hệ thống hiển thị: tên sách, người mượn, ngày mượn, ngày hạn trả, tình trạng (đúng hạn / quá hạn X ngày)
4. Thủ thư kiểm tra tình trạng vật lý của sách và xác nhận trả
5. Hệ thống cập nhật LoanRecord: returnDate = now, status = RETURNED
6. Nếu returnDate > dueDate:
   - a. Tính số ngày quá hạn
   - b. Tạo FineRecord cho mỗi ngày quá hạn chưa có record (idempotent)
   - c. Hiển thị tổng phạt phát sinh cho Thủ thư
7. Hệ thống kiểm tra Reservation queue cho đầu sách này:
   - a. Nếu có Reservation WAITING → cập nhật BookCopy.status = `reserved`; cập nhật Reservation đầu hàng → NOTIFIED; set holdExpiryAt = now + 48h; gửi email thông báo
   - b. Nếu không có Reservation → cập nhật BookCopy.status = `available`
8. Ghi audit_log

**Luồng thay thế:**

- **2a.** Không tìm thấy LoanRecord → Báo lỗi "Bản sao này không đang được mượn"; cho phép tìm theo memberCardNo
- **4a.** Sách bị hư hỏng → Thủ thư đánh dấu BookCopy.status = `damaged`; vẫn hoàn tất trả sách nhưng copy không quay lại lưu thông
- **6a.** Member muốn thanh toán phạt ngay → Chuyển sang luồng UC–FINE-03

---

##### UC–LOAN-03: Gia hạn sách

- **Actor chính:** Member (online) hoặc Thủ thư (tại quầy)
- **Preconditions:** LoanRecord.status = ACTIVE; renewCount < maxRenewals theo LoanPolicy
- **Postconditions:** dueDate được cộng thêm renewDays; renewCount tăng 1

**Luồng chính (Main Flow):**

1. Member đăng nhập và truy cập "Sách đang mượn" (hoặc Thủ thư thao tác tại quầy)
2. Chọn LoanRecord cần gia hạn và nhấn "Gia hạn"
3. Hệ thống kiểm tra:
   - a. LoanRecord.status = ACTIVE (không phải OVERDUE)
   - b. renewCount < maxRenewals (theo LoanPolicy của member)
   - c. Không có Reservation đang WAITING cho cùng đầu sách (Book)
4. Hệ thống cập nhật: dueDate = dueDate + renewDays; renewCount += 1
5. Hiển thị ngày hạn trả mới
6. Gửi email xác nhận gia hạn (ngày hạn trả mới)
7. Ghi audit_log

**Luồng thay thế:**

- **3a.** LoanRecord đang OVERDUE → Từ chối gia hạn; thông báo "Sách đã quá hạn, vui lòng trả và thanh toán phạt"
- **3b.** renewCount ≥ maxRenewals → Từ chối; thông báo "Đã hết lượt gia hạn (đã gia hạn X/X lần)"
- **3c.** Có Reservation WAITING → Từ chối; thông báo "Sách đang có người đặt trước, không thể gia hạn"

---

##### UC–LOAN-04: Xem lịch sử mượn

- **Actor chính:** Member (xem của bản thân) / Thủ thư (xem của bất kỳ member)
- **Preconditions:** Người dùng đã đăng nhập
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Member truy cập "Lịch sử mượn sách" từ trang cá nhân
2. Hệ thống hiển thị danh sách LoanRecord phân trang, sắp xếp theo checkoutDate giảm dần
3. Mỗi record hiển thị: tên sách, barcode, ngày mượn, ngày hạn trả, ngày trả thực tế, status, số lần gia hạn
4. Cho phép lọc theo: status (ACTIVE / RETURNED / OVERDUE / LOST), khoảng thời gian

**Luồng thay thế:**

- **1a.** Thủ thư truy cập lịch sử của member khác → Tìm kiếm member → chọn → xem lịch sử đầy đủ bao gồm cả FineRecord liên quan
- **4a.** Không có lịch sử mượn → Hiển thị "Chưa có lịch sử mượn sách" + gợi ý tìm kiếm sách

---

##### UC–LOAN-05: Block mượn mới

- **Actor chính:** Cron Job (tự động) / Thủ thư (thủ công)
- **Preconditions:** Member có tổng FineRecord.status = UNPAID vượt ngưỡng cấu hình
- **Postconditions:** member.is_blocked = true; Member không thể checkout sách mới

**Luồng chính — Tự động (Cron Job):**

1. Cron Job chạy hàng ngày sau khi tính phạt (sau FINE-01)
2. Với mỗi Member: tính tổng fine chưa thanh toán = SUM(amount) WHERE status = UNPAID
3. Nếu tổng ≥ ngưỡng (mặc định 50.000đ) VÀ member.is_blocked = false:
   - a. Cập nhật member.is_blocked = true
   - b. Gửi email thông báo cho Member: tổng phạt, hướng dẫn thanh toán
   - c. Ghi audit_log (actor = SYSTEM)
4. Nếu tổng < ngưỡng VÀ member.is_blocked = true (đã thanh toán một phần):
   - a. Cập nhật member.is_blocked = false
   - b. Gửi email thông báo mở block
   - c. Ghi audit_log

**Luồng thay thế:**

- **1a.** Thủ thư thủ công block/unblock → Override hệ thống; ghi lý do + actorId

---

##### UC–LOAN-06: Ghi nhận mất sách

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; LoanRecord đang ACTIVE hoặc OVERDUE
- **Postconditions:** LoanRecord.status = LOST; BookCopy.status = `lost`; FineRecord đặc biệt được tạo

**Luồng chính (Main Flow):**

1. Thủ thư tìm kiếm LoanRecord theo member hoặc barcode
2. Chọn LoanRecord cần đánh dấu mất và nhấn "Ghi nhận mất sách"
3. Hệ thống hiển thị thông tin: tên sách, giá trị sách (bookValue), phạt quá hạn hiện tại (nếu có)
4. Thủ thư xác nhận và tuỳ chọn nhập ghi chú
5. Hệ thống cập nhật LoanRecord.status = LOST
6. Cập nhật BookCopy.status = `lost`
7. Tạo FineRecord đặc biệt: amount = bookValue (hoặc hệ số × bookValue theo cấu hình); note = "Mất sách"
8. Gửi email thông báo cho Member: thông tin phạt + hướng dẫn thanh toán
9. Ghi audit_log

**Luồng thay thế:**

- **3a.** Sách không có bookValue → Thủ thư nhập giá trị thủ công
- **7a.** Member muốn thay thế bằng sách mới (cùng ISBN) → Thủ thư tạo BookCopy mới; miễn giảm fine; ghi chú "Thay thế bản sao"

---

### 3.4 Domain: Reservation

Quản lý hàng chờ đặt trước cho sách hiện đang được mượn toàn bộ bản sao.

#### 3.4.1 Entities chính

- Reservation: reservationId, memberId (FK), bookId (FK), queuePosition, status \[WAITING \| NOTIFIED \| HOLD \| FULFILLED \| CANCELLED \| EXPIRED\], requestDate, notifiedAt, holdExpiryAt

#### 3.4.2 Luồng xử lý Reservation Queue

1. Member đặt trước → tạo Reservation (WAITING), gán queuePosition = max + 1

2. Khi một BookCopy được trả → hệ thống tìm Reservation đầu hàng (queuePosition = 1)

3. Cập nhật Reservation → NOTIFIED; gửi email cho Member; giữ BookCopy khỏi lưu thông

4. Nếu Member đến nhận trong holdExpiry (48h) → checkout bình thường → FULFILLED

5. Nếu hết holdExpiry → Reservation → EXPIRED; giảm queuePosition toàn bộ hàng chờ; xét người tiếp theo

#### 3.4.3 Yêu cầu chức năng

|            |                         |                                                                                                 |               |                |                |
|------------|-------------------------|-------------------------------------------------------------------------------------------------|---------------|----------------|----------------|
| **ID**     | **Tên**                 | **Mô tả**                                                                                       | **Ưu tiên**   | **Role**       | **Trạng thái** |
| **RES-01** | **Đặt trước**           | Member đặt Book khi toàn bộ copy đang BORROWED; không cho đặt trước khi còn copy available      | **Must have** | Member         | ✅ Active      |
| **RES-02** | **Xem vị trí hàng chờ** | Member xem mình đang ở vị trí thứ mấy trong queue                                               | **Must have** | Member         | ✅ Active      |
| **RES-03** | **Tự động notify**      | Khi copy được trả → notify người đầu hàng qua email trong vòng 5 phút (async job)               | **Must have** | Cron/System    | ✅ Active      |
| **RES-04** | **Hold 48h**            | Giữ copy cho người được notify; nếu không nhận sau holdExpiry → chuyển người tiếp theo          | **Must have** | Cron/System    | ✅ Active      |
| **RES-05** | **Huỷ đặt trước**       | Member tự huỷ trước khi được notify; Thủ thư huỷ bất kỳ reservation; cập nhật lại queuePosition | **Must have** | Member/Thủ thư | ✅ Active      |
| **RES-06** | **Chặn gia hạn**        | Nếu Book có Reservation WAITING → không cho Member đang mượn gia hạn                            | **Must have** | System         | ✅ Active      |

#### 3.4.4 Use Case Chi Tiết — Reservation

##### UC–RES-01: Đặt trước sách

- **Actor chính:** Member (Sinh viên / Giảng viên)
- **Preconditions:** Member đã đăng nhập; status = `active`; toàn bộ BookCopy của đầu sách đều đang borrowed/reserved
- **Postconditions:** Reservation mới được tạo (status = WAITING, queuePosition = max+1)

**Luồng chính (Main Flow):**

1. Member truy cập trang chi tiết sách và thấy 0 bản sao available
2. Member nhấn "Đặt trước"
3. Hệ thống kiểm tra:
   - a. Member.status = `active`
   - b. Toàn bộ BookCopy của Book có status ≠ `available` (nếu còn copy available → từ chối đặt trước)
   - c. Member chưa có Reservation đang WAITING/NOTIFIED/HOLD cho cùng Book
   - d. Member không bị block
4. Hệ thống tạo Reservation: queuePosition = (max queuePosition hiện tại + 1), status = WAITING, requestDate = now
5. Hiển thị: "Đặt trước thành công. Bạn đang ở vị trí #X trong hàng chờ."
6. Ghi audit_log

**Luồng thay thế:**

- **3b.** Còn BookCopy available → Thông báo "Sách còn bản sao sẵn sàng, vui lòng đến quầy để mượn"; không cho đặt trước
- **3c.** Đã có Reservation cho cùng Book → Thông báo "Bạn đã đặt trước sách này (vị trí #X)"
- **3d.** Member bị block → Thông báo "Tài khoản bị hạn chế. Vui lòng thanh toán phạt trước"

---

##### UC–RES-02: Xem vị trí hàng chờ

- **Actor chính:** Member
- **Preconditions:** Member đã đăng nhập; có ít nhất 1 Reservation đang active
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Member truy cập "Đặt trước của tôi"
2. Hệ thống hiển thị danh sách Reservation đang WAITING/NOTIFIED/HOLD:
   - Tên sách, ngày đặt, vị trí hàng chờ, status, thời gian ước tính (dựa trên dueDate gần nhất của copy đang mượn)
3. Với Reservation đang NOTIFIED/HOLD: hiển thị holdExpiryAt + đếm ngược thời gian còn lại

**Luồng thay thế:**

- **2a.** Không có Reservation nào → Hiển thị "Bạn chưa đặt trước sách nào"
- **2b.** Hiển thị thêm lịch sử Reservation đã FULFILLED/CANCELLED/EXPIRED (collapsed by default)

---

##### UC–RES-03: Tự động notify khi sách được trả

- **Actor chính:** System (triggered bởi sự kiện trả sách UC–LOAN-02)
- **Preconditions:** BookCopy vừa được trả; có Reservation WAITING cho đầu sách tương ứng
- **Postconditions:** Reservation đầu hàng → NOTIFIED; BookCopy → `reserved`; email được gửi

**Luồng chính (Main Flow):**

1. Sau khi UC–LOAN-02 hoàn tất, hệ thống dispatch event `book.copy.returned`
2. Async job nhận event, tìm Reservation WAITING đầu hàng (queuePosition nhỏ nhất) cho Book
3. Cập nhật Reservation: status = NOTIFIED, notifiedAt = now, holdExpiryAt = now + 48h
4. Cập nhật BookCopy.status = `reserved`
5. Gửi email cho Member: tên sách, vị trí thư viện, thời hạn nhận (holdExpiryAt), link đến trang reservation
6. Ghi notification_log (đảm bảo deduplicate)

**Luồng ngoại lệ:**

- **E1.** Gửi email thất bại → Retry 3 lần (backoff 1, 5, 15 phút); nếu vẫn thất bại → ghi log lỗi; Reservation vẫn ở NOTIFIED
- **E2.** Không tìm thấy Reservation WAITING → BookCopy.status = `available`; không gửi email

---

##### UC–RES-04: Hold 48h và xử lý hết hạn

- **Actor chính:** Cron Job
- **Preconditions:** Reservation có status = NOTIFIED hoặc HOLD
- **Postconditions:** Nếu hết hạn → Reservation = EXPIRED; xét người tiếp theo trong hàng chờ

**Luồng chính (Main Flow):**

1. Cron Job chạy mỗi 30 phút, tìm tất cả Reservation có holdExpiryAt ≤ now
2. Với mỗi Reservation hết hạn:
   - a. Cập nhật status = EXPIRED
   - b. Gửi email thông báo cho Member: "Thời hạn nhận sách đã hết"
   - c. Giảm queuePosition của tất cả Reservation WAITING cùng Book (-1)
   - d. Tìm Reservation WAITING tiếp theo (queuePosition = 1 sau khi giảm)
   - e. Nếu có → lặp lại UC–RES-03 (notify người tiếp theo)
   - f. Nếu không → cập nhật BookCopy.status = `available`
3. Ghi audit_log cho mỗi Reservation đã EXPIRED

**Luồng thay thế:**

- **2d.** Trước khi hold hết hạn 12h → Gửi email nhắc nhở "Còn 12h để nhận sách"

---

##### UC–RES-05: Huỷ đặt trước

- **Actor chính:** Member (tự huỷ) / Thủ thư (huỷ bất kỳ)
- **Preconditions:** Reservation tồn tại với status = WAITING hoặc NOTIFIED
- **Postconditions:** Reservation.status = CANCELLED; queuePosition của các Reservation phía sau được giảm 1

**Luồng chính (Main Flow):**

1. Member truy cập "Đặt trước của tôi" hoặc Thủ thư tìm Reservation cần huỷ
2. Nhấn "Huỷ đặt trước"
3. Hệ thống hiển thị xác nhận: "Huỷ đặt trước [Tên sách]?"
4. Người dùng xác nhận
5. Hệ thống cập nhật Reservation.status = CANCELLED
6. Giảm queuePosition của tất cả Reservation WAITING cùng Book có queuePosition lớn hơn (-1)
7. Nếu Reservation đang NOTIFIED (member đã được notify nhưng chưa nhận):
   - a. Giải phóng BookCopy → tìm người WAITING tiếp theo (UC–RES-03) hoặc set `available`
8. Ghi audit_log

**Luồng thay thế:**

- **2a.** Reservation đã FULFILLED/EXPIRED/CANCELLED → Không cho phép huỷ; hiển thị thông báo "Đặt trước này đã hoàn tất/hết hạn"
- **1a.** Member chỉ có thể huỷ reservation của chính mình; Thủ thư có thể huỷ bất kỳ

---

##### UC–RES-06: Chặn gia hạn khi có đặt trước

- **Actor chính:** System (kiểm tra tự động trong luồng gia hạn)
- **Preconditions:** Member yêu cầu gia hạn sách (UC–LOAN-03)
- **Postconditions:** Gia hạn bị từ chối nếu có Reservation WAITING cho cùng đầu sách

**Luồng chính (Main Flow):**

1. Trong bước 3c của UC–LOAN-03, hệ thống truy vấn: SELECT COUNT(*) FROM reservations WHERE bookId = :bookId AND status = 'WAITING'
2. Nếu count > 0 → trả về lỗi; gia hạn bị từ chối
3. Thông báo cho Member: "Sách đang có [X] người đặt trước, không thể gia hạn. Vui lòng trả sách đúng hạn."

**Luồng thay thế:**

- **2a.** Count = 0 → Cho phép gia hạn; tiếp tục luồng UC–LOAN-03

---

### 3.5 Domain: Fine

Tính toán, ghi nhận và xử lý phạt quá hạn trả sách.

#### 3.5.1 Entities chính

- FineRecord: fineId, loanId (FK), memberId (FK), overdue_date (date), amount, status \[UNPAID \| PAID \| WAIVED\], paidAt, waivedBy, note
- FineRate: rateId, ratePerDay (VNĐ), appliesTo \[all \| category_id\], effectiveFrom

#### 3.5.2 Logic tính phạt

Cron Job chạy lúc 00:05 mỗi ngày. Với mỗi LoanRecord có status = OVERDUE:

- Tính số ngày quá hạn = current_date - dueDate
- Với mỗi ngày quá hạn chưa có FineRecord: INSERT INTO fine_records (loanId, overdue_date, amount) — constraint UNIQUE (loanId, overdue_date) đảm bảo idempotent
- Cộng dồn tổng fine chưa thanh toán cho Member
- Nếu tổng fine \> ngưỡng (cấu hình, mặc định 50.000đ) → cập nhật member.is_blocked = true

#### 3.5.3 Yêu cầu chức năng

|             |                         |                                                                                                                 |                 |          |                |
|-------------|-------------------------|-----------------------------------------------------------------------------------------------------------------|-----------------|----------|----------------|
| **ID**      | **Tên**                 | **Mô tả**                                                                                                       | **Ưu tiên**     | **Role** | **Trạng thái** |
| **FINE-01** | **Tính phạt tự động**   | Cron job chạy hàng ngày; idempotent — UNIQUE constraint (loanId, overdue_date); FineRate lấy theo ngày hiệu lực | **Must have**   | Cron     | ✅ Active      |
| **FINE-02** | **Xem phạt**            | Member xem tổng phạt và chi tiết từng FineRecord; Thủ thư xem của bất kỳ member                                 | **Must have**   | Tất cả   | ✅ Active      |
| **FINE-03** | **Ghi nhận thanh toán** | Thủ thư đánh dấu PAID sau khi Member nộp tiền trực tiếp; ghi paidAt, amount_paid                                | **Must have**   | Thủ thư  | ✅ Active      |
| **FINE-04** | **Miễn giảm phạt**      | Thủ thư/Admin miễn giảm toàn bộ hoặc một phần fine; ghi waivedBy + lý do                                        | **Should have** | Thủ thư  | 🔲 Planned     |
| **FINE-05** | **Block / Unblock**     | Auto block khi tổng fine \> ngưỡng; unblock khi đã thanh toán đủ; ghi log thay đổi                              | **Must have**   | System   | ✅ Active      |

#### 3.5.4 Use Case Chi Tiết — Fine

##### UC–FINE-01: Tính phạt tự động

- **Actor chính:** Cron Job
- **Preconditions:** Có ít nhất 1 LoanRecord với status = OVERDUE
- **Postconditions:** FineRecord được tạo cho mỗi ngày quá hạn chưa có record; tổng phạt Member được cập nhật

**Luồng chính (Main Flow):**

1. Cron Job khởi chạy lúc 00:05 hàng ngày
2. Truy vấn tất cả LoanRecord có status = ACTIVE và dueDate < current_date → cập nhật status = OVERDUE
3. Truy vấn tất cả LoanRecord có status = OVERDUE
4. Xử lý theo batch (100 record/lần) để tránh timeout:
   - a. Tính overdue_days = current_date - dueDate
   - b. Lấy FineRate hiện hành (effectiveFrom ≤ current_date, ORDER BY effectiveFrom DESC LIMIT 1)
   - c. Với mỗi ngày quá hạn d (từ dueDate+1 đến current_date):
     - INSERT INTO fine_records (loanId, memberId, overdue_date=d, amount=ratePerDay, status=UNPAID)
     - ON CONFLICT (loanId, overdue_date) DO NOTHING — đảm bảo idempotent
5. Tính tổng fine chưa thanh toán cho mỗi Member liên quan
6. Nếu tổng ≥ ngưỡng block → trigger UC–LOAN-05
7. Ghi log: số record đã xử lý, số fine mới tạo, thời gian chạy

**Luồng ngoại lệ:**

- **E1.** Batch xử lý lỗi → Retry batch đó 3 lần; nếu vẫn lỗi → ghi log lỗi + alert admin; tiến tới batch tiếp theo
- **E2.** FineRate không tồn tại → Sử dụng rate mặc định (5.000đ/ngày); ghi cảnh báo

---

##### UC–FINE-02: Xem phạt

- **Actor chính:** Member (xem của bản thân) / Thủ thư (xem bất kỳ member)
- **Preconditions:** Người dùng đã đăng nhập
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Member truy cập "Phạt của tôi" từ menu cá nhân
2. Hệ thống hiển thị dashboard phạt:
   - a. Tổng phạt chưa thanh toán (UNPAID)
   - b. Tổng phạt đã thanh toán (PAID)
   - c. Tổng phạt được miễn giảm (WAIVED)
3. Bên dưới: danh sách chi tiết FineRecord phân trang, sắp xếp theo overdue_date giảm dần
4. Mỗi record hiển thị: tên sách, ngày quá hạn, số tiền, status, ngày thanh toán (nếu PAID)
5. Cho phép lọc theo: status (UNPAID / PAID / WAIVED), khoảng thời gian

**Luồng thay thế:**

- **1a.** Thủ thư → Tìm kiếm member → xem phạt chi tiết + nút thanh toán / miễn giảm
- **2a.** Không có phạt → Hiển thị "Không có khoản phạt nào"

---

##### UC–FINE-03: Ghi nhận thanh toán

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập; FineRecord tồn tại với status = UNPAID
- **Postconditions:** FineRecord.status = PAID; paidAt được ghi nhận; kiểm tra unblock Member

**Luồng chính (Main Flow):**

1. Thủ thư tìm kiếm Member và xem danh sách phạt UNPAID
2. Member nộp tiền trực tiếp tại quầy
3. Thủ thư chọn các FineRecord cần đánh dấu đã thanh toán (hỗ trợ chọn nhiều)
4. Hệ thống hiển thị tổng số tiền cần thu
5. Thủ thư xác nhận đã nhận tiền và nhấn "Ghi nhận thanh toán"
6. Hệ thống cập nhật: status = PAID, paidAt = now, amount_paid = amount cho mỗi FineRecord đã chọn
7. Kiểm tra: nếu tổng fine UNPAID còn lại < ngưỡng block VÀ member.is_blocked = true → unblock Member
8. In biên lai thanh toán (tuỳ chọn)
9. Ghi audit_log

**Luồng thay thế:**

- **3a.** Thủ thư chọn "Thanh toán tất cả" → Đánh dấu PAID toàn bộ FineRecord UNPAID
- **6a.** Member thanh toán một phần → Thủ thư chỉ chọn các FineRecord tương ứng số tiền đã nhận

---

##### UC–FINE-04: Miễn giảm phạt

- **Actor chính:** Thủ thư / Admin
- **Preconditions:** Thủ thư hoặc Admin đã đăng nhập; FineRecord tồn tại với status = UNPAID
- **Postconditions:** FineRecord.status = WAIVED; waivedBy và lý do được ghi nhận

**Luồng chính (Main Flow):**

1. Thủ thư tìm Member và xem danh sách phạt UNPAID
2. Chọn FineRecord cần miễn giảm
3. Nhập lý do miễn giảm (bắt buộc, ≥ 10 ký tự)
4. Hệ thống hiển thị xác nhận: "Miễn giảm [X]đ cho [Tên Member]? Lý do: [...]"
5. Thủ thư xác nhận
6. Cập nhật: status = WAIVED, waivedBy = actorId, note = lý do
7. Kiểm tra unblock (tương tự FINE-03 bước 7)
8. Ghi audit_log

**Luồng thay thế:**

- **2a.** Miễn giảm một phần: giảm amount của FineRecord thay vì WAIVED toàn bộ; ghi lý do + số tiền giảm
- **3a.** Lý do quá ngắn → Báo lỗi validation

---

##### UC–FINE-05: Auto Block / Unblock

- **Actor chính:** System (Cron Job hoặc trigger sau thanh toán/miễn giảm)
- **Preconditions:** Member có thay đổi tổng fine UNPAID
- **Postconditions:** member.is_blocked được cập nhật tương ứng

**Luồng chính — Block:**

1. Sau UC–FINE-01 hoặc khi tạo FineRecord mới, hệ thống tính tổng fine UNPAID của Member
2. Nếu tổng ≥ ngưỡng (cấu hình, mặc định 50.000đ) VÀ is_blocked = false:
   - a. Cập nhật member.is_blocked = true
   - b. Ghi block_log: reason = "Auto block — fine threshold exceeded", totalFine, threshold
   - c. Gửi email thông báo

**Luồng chính — Unblock:**

1. Sau UC–FINE-03 hoặc UC–FINE-04, hệ thống tính lại tổng fine UNPAID
2. Nếu tổng < ngưỡng VÀ is_blocked = true:
   - a. Cập nhật member.is_blocked = false
   - b. Ghi block_log: reason = "Auto unblock — fine below threshold"
   - c. Gửi email thông báo mở block

---

### 3.6 Domain: Notification

Gửi thông báo tự động qua email cho độc giả theo các sự kiện nghiệp vụ.

#### 3.6.1 Danh sách sự kiện thông báo

|                         |                                                  |                        |          |
|-------------------------|--------------------------------------------------|------------------------|----------|
| **Sự kiện**             | **Nội dung**                                     | **Trigger**            | **Kênh** |
| **Sắp đến hạn trả**     | Nhắc trả sách; tên sách, ngày hạn, link gia hạn  | Cron: trước 3 ngày     | Email    |
| **Quá hạn**             | Thông báo phạt phát sinh; tổng tiền phạt đến nay | Cron: hàng ngày        | Email    |
| **Sách sẵn sàng**       | Sách đặt trước đã có; phải đến nhận trong 48h    | Return event           | Email    |
| **Hold sắp hết hạn**    | Còn 12h để nhận sách đã hold                     | Cron: 12h trước expiry | Email    |
| **Checkout thành công** | Xác nhận mượn; danh sách sách + ngày hạn trả     | Checkout event         | Email    |
| **Tài khoản bị khoá**   | Thông báo tài khoản bị suspend + lý do           | Manual trigger         | Email    |

#### 3.6.2 Use Case Chi Tiết — Notification

##### UC–NOTI-01: Nhắc nhở sắp đến hạn trả

- **Actor chính:** Cron Job
- **Preconditions:** LoanRecord có status = ACTIVE và dueDate trong khoảng [now, now + 3 ngày]
- **Postconditions:** Email nhắc nhở được gửi; notification_log được ghi

**Luồng chính (Main Flow):**

1. Cron Job chạy lúc 08:00 hàng ngày
2. Truy vấn LoanRecord WHERE status = ACTIVE AND dueDate BETWEEN now AND now + 3 days
3. Với mỗi record: kiểm tra notification_log đã gửi reminder cho (loanId, overdue_reminder, today) chưa
4. Nếu chưa gửi → tạo email từ template: tên sách, ngày hạn trả, link gia hạn (nếu đủ điều kiện)
5. Đẩy email vào queue (BullMQ)
6. Ghi notification_log: loanId, event=REMINDER, sentAt=now

**Luồng ngoại lệ:**

- **E1.** Email queue đầy → Retry sau 5 phút; tối đa 3 lần

---

##### UC–NOTI-02: Thông báo quá hạn hàng ngày

- **Actor chính:** Cron Job
- **Preconditions:** LoanRecord có status = OVERDUE
- **Postconditions:** Email thông báo phạt hàng ngày được gửi

**Luồng chính (Main Flow):**

1. Cron Job chạy lúc 08:30 hàng ngày (sau job tính phạt FINE-01)
2. Truy vấn LoanRecord WHERE status = OVERDUE
3. Nhóm theo Member: gửi 1 email tổng hợp cho mỗi Member (không gửi nhiều email cho nhiều sách)
4. Nội dung email: danh sách sách quá hạn, số ngày quá hạn mỗi cuốn, tổng phạt cộng dồn, hướng dẫn trả sách
5. Kiểm tra deduplicate: 1 email overdue/member/ngày
6. Ghi notification_log

---

##### UC–NOTI-03: Thông báo sách sẵn sàng (Reservation)

- **Actor chính:** System (triggered bởi UC–LOAN-02 / UC–RES-03)
- **Preconditions:** Reservation vừa chuyển sang NOTIFIED
- **Postconditions:** Email được gửi cho Member đặt trước

**Luồng chính:** Mô tả trong UC–RES-03 (bước 5). Nội dung email bao gồm: tên sách, vị trí kệ/quầy nhận, thời hạn nhận (holdExpiryAt cụ thể ngày giờ), link đến trang "Đặt trước của tôi".

---

##### UC–NOTI-04: Nhắc hold sắp hết hạn

- **Actor chính:** Cron Job
- **Preconditions:** Reservation có status = NOTIFIED và holdExpiryAt trong khoảng [now, now + 12h]
- **Postconditions:** Email nhắc nhở được gửi

**Luồng chính (Main Flow):**

1. Cron Job chạy mỗi giờ
2. Tìm Reservation WHERE status = NOTIFIED AND holdExpiryAt BETWEEN now AND now + 12h
3. Kiểm tra chưa gửi nhắc hold_reminder cho reservation này
4. Gửi email: "Còn [X] giờ để nhận sách [Tên sách]. Sau thời hạn, sách sẽ được chuyển cho người tiếp theo."
5. Ghi notification_log

---

##### UC–NOTI-05: Xác nhận checkout thành công

- **Actor chính:** System (triggered bởi UC–LOAN-01)
- **Preconditions:** LoanRecord vừa được tạo thành công
- **Postconditions:** Email xác nhận được gửi cho Member

**Luồng chính:** Sau UC–LOAN-01 bước 8. Nội dung email: danh sách sách vừa mượn (tên, barcode), ngày mượn, ngày hạn trả, quy định gia hạn, link đến "Sách đang mượn".

---

##### UC–NOTI-06: Thông báo tài khoản bị khoá

- **Actor chính:** System (triggered bởi UC–MEM-03 hoặc UC–FINE-05)
- **Preconditions:** Member.status vừa chuyển sang `suspended` hoặc is_blocked = true
- **Postconditions:** Email thông báo được gửi

**Luồng chính:** Gửi email cho Member bao gồm: lý do khoá, ngày khoá, thông tin liên hệ thư viện, hướng dẫn giải quyết (thanh toán phạt / liên hệ trực tiếp).

---

### 3.7 Domain: Report

Cung cấp thống kê và báo cáo vận hành thư viện cho thủ thư và ban quản lý.

|            |                          |                                                                                    |                 |          |                |
|------------|--------------------------|------------------------------------------------------------------------------------|-----------------|----------|----------------|
| **ID**     | **Tên**                  | **Mô tả**                                                                          | **Ưu tiên**     | **Role** | **Trạng thái** |
| **RPT-01** | **Báo cáo mượn/trả**     | Thống kê số lượng checkout/return theo ngày/tuần/tháng; lọc theo thể loại, tác giả | **Must have**   | Thủ thư  | ✅ Active      |
| **RPT-02** | **Danh sách quá hạn**    | Danh sách tất cả LoanRecord đang OVERDUE; sắp xếp theo số ngày quá hạn giảm dần    | **Must have**   | Thủ thư  | ✅ Active      |
| **RPT-03** | **Sách được mượn nhiều** | Top 20 đầu sách mượn nhiều nhất trong kỳ; biểu đồ xu hướng                         | **Should have** | Thủ thư  | 🔲 Planned     |
| **RPT-04** | **Tình trạng tồn kho**   | Số bản sao theo status (available/borrowed/damaged/lost) theo đầu sách             | **Must have**   | Thủ thư  | ✅ Active      |
| **RPT-05** | **Thống kê phạt**        | Tổng fine thu được theo tháng; danh sách Member còn nợ phạt                        | **Should have** | Thủ thư  | 🔲 Planned     |
| **RPT-06** | **Xuất Excel/PDF**       | Xuất bất kỳ báo cáo nào ra file; ghi log lần xuất                                  | **Should have** | Thủ thư  | 🔲 Planned     |

#### 3.7.1 Use Case Chi Tiết — Report

##### UC–RPT-01: Báo cáo mượn/trả

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Thủ thư truy cập "Báo cáo" → chọn "Thống kê mượn/trả"
2. Chọn khoảng thời gian: ngày / tuần / tháng / tuỳ chỉnh
3. Tuỳ chọn lọc: theo thể loại, tác giả, role (sinh viên / giảng viên)
4. Hệ thống hiển thị:
   - a. Biểu đồ cột: số lượng checkout và return theo thời gian
   - b. Bảng chi tiết: ngày, số checkout, số return, số đang mượn hiện tại
   - c. Tỷ lệ trả đúng hạn vs quá hạn
5. Cho phép xuất ra Excel/PDF (UC–RPT-06)

---

##### UC–RPT-02: Danh sách quá hạn

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Thủ thư truy cập "Báo cáo" → chọn "Sách quá hạn"
2. Hệ thống hiển thị danh sách LoanRecord có status = OVERDUE, sắp xếp theo số ngày quá hạn giảm dần
3. Mỗi dòng: tên sách, barcode, tên Member, email, số điện thoại, ngày hạn trả, số ngày quá hạn, tổng phạt cộng dồn
4. Cho phép thao tác nhanh: gửi email nhắc nhở (cho 1 hoặc nhiều member), block tài khoản
5. Tổng hợp: tổng số sách quá hạn, tổng phạt chưa thu

---

##### UC–RPT-03: Sách được mượn nhiều nhất

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Thủ thư chọn "Sách phổ biến" và khoảng thời gian (tháng / quý / năm)
2. Hệ thống truy vấn: GROUP BY bookId, COUNT(loanId), ORDER BY count DESC LIMIT 20
3. Hiển thị:
   - a. Bảng xếp hạng: Top 20 đầu sách, số lượt mượn, thể loại, số bản sao hiện có
   - b. Biểu đồ xu hướng (line chart) cho top 5 sách theo tháng
4. Gợi ý: sách có nhu cầu cao nhưng ít bản sao → đề xuất mua thêm

---

##### UC–RPT-04: Tình trạng tồn kho

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Thủ thư truy cập "Tồn kho"
2. Hệ thống hiển thị thống kê tổng quan: tổng đầu sách, tổng bản sao, phân bố theo status (available, borrowed, reserved, damaged, lost)
3. Bảng chi tiết theo đầu sách: tên sách, tổng copy, breakdown theo status
4. Cho phép lọc: theo thể loại, tình trạng, sách có 0 copy available
5. Highlight: sách có tỷ lệ lost/damaged cao (> 20% tổng copy)

---

##### UC–RPT-05: Thống kê phạt

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đã đăng nhập
- **Postconditions:** Không thay đổi dữ liệu

**Luồng chính (Main Flow):**

1. Thủ thư chọn "Thống kê phạt" và khoảng thời gian
2. Hệ thống hiển thị:
   - a. Tổng phạt phát sinh (UNPAID + PAID + WAIVED) trong kỳ
   - b. Tổng phạt đã thu (PAID)
   - c. Tổng phạt được miễn giảm (WAIVED)
   - d. Tổng phạt còn nợ (UNPAID) trên toàn hệ thống
3. Biểu đồ xu hướng: phạt phát sinh vs thu được theo tháng
4. Danh sách Member còn nợ phạt: sắp xếp theo tổng nợ giảm dần; hiển thị tên, email, tổng nợ, số sách quá hạn

---

##### UC–RPT-06: Xuất Excel/PDF

- **Actor chính:** Thủ thư
- **Preconditions:** Thủ thư đang xem một báo cáo bất kỳ (RPT-01 → RPT-05)
- **Postconditions:** File Excel hoặc PDF được tạo và tải về; log xuất file được ghi

**Luồng chính (Main Flow):**

1. Từ bất kỳ trang báo cáo nào, Thủ thư nhấn "Xuất file"
2. Chọn định dạng: Excel (.xlsx) hoặc PDF
3. Hệ thống sinh file bao gồm: tiêu đề báo cáo, khoảng thời gian, bộ lọc đã áp dụng, dữ liệu bảng, biểu đồ (chỉ PDF)
4. File được tải về trình duyệt
5. Ghi export_log: reportType, format, filters, exportedBy, timestamp

**Luồng ngoại lệ:**

- **E1.** Dữ liệu quá lớn (> 100.000 dòng) → Sinh file bất đồng bộ; gửi email kèm link download khi hoàn tất

---

## 4. Yêu Cầu Phi Chức Năng

|                   |                         |                                                                                                 |
|-------------------|-------------------------|-------------------------------------------------------------------------------------------------|
| **Nhóm**          | **Chỉ số mục tiêu**     | **Mô tả**                                                                                       |
| **Hiệu năng**     | **p95 \< 300ms**        | 95% API response dưới 300ms trong điều kiện bình thường; search full-text \< 500ms              |
| **Khả dụng**      | **99.5% uptime**        | Downtime tối đa 4h/tháng; cron job có retry 3 lần khi thất bại                                  |
| **Bảo mật**       | **OWASP Top 10**        | JWT + Refresh Token rotation; rate limiting; SQL injection prevention; bcrypt password          |
| **Mở rộng**       | **Horizontal scale**    | Stateless API; session không lưu server-side; cron job idempotent để có thể chạy nhiều instance |
| **Dữ liệu**       | **Soft delete toàn bộ** | Không xoá cứng bất kỳ record nào có lịch sử loan/fine; backup hàng ngày                         |
| **Audit log**     | **Ghi toàn bộ write**   | Mọi thao tác thay đổi dữ liệu ghi audit_log: actor, action, entity, timestamp, before/after     |
| **Accessibility** | **Responsive web**      | Giao diện độc giả hoạt động trên mobile; font tối thiểu 14px; WCAG 2.1 AA                       |

## 5. Kiến Trúc & Tech Stack

### 5.1 Kiến Trúc Tổng Quan

Hệ thống theo mô hình Layered Architecture: Route → Controller → Service → Repository → Database. Tách biệt hoàn toàn business logic (Service) khỏi framework (Controller) để dễ unit test.

|                     |                                                                         |
|---------------------|-------------------------------------------------------------------------|
| **Runtime**         | Node.js 20 LTS + Express 5                                              |
| **Database**        | PostgreSQL 16 (primary); Redis (session cache, job queue)               |
| **ORM**             | Prisma hoặc TypeORM — migration-based, không dùng sync                  |
| **Auth**            | JWT (Access Token 15 phút + Refresh Token 7 ngày, rotation)             |
| **Background jobs** | BullMQ trên Redis — cron jobs: fine calculation, hold expiry, reminders |
| **Email**           | Nodemailer + SMTP (hoặc SendGrid); queue-based, không block request     |
| **File export**     | ExcelJS (xlsx), PDFKit (pdf)                                            |
| **Testing**         | Jest + Supertest; target 80% coverage trên Service layer                |
| **Deployment**      | Docker Compose (dev); VPS + Nginx reverse proxy (prod)                  |

### 5.2 Cấu Trúc Thư Mục (Đề xuất)

**src/**

- modules/catalog — Book, BookCopy routes + controllers + services
- modules/member — Auth, Member management
- modules/loan — Checkout, return, renewal logic
- modules/reservation — Queue management
- modules/fine — Fine calculation, payment
- modules/notification — Email templates, dispatch
- modules/report — Aggregation queries, export
- jobs/ — BullMQ workers: fineJob, holdExpiryJob, reminderJob
- prisma/ — Schema, migrations, seeds
- common/ — Middleware, error handler, audit logger, helpers

## 6. Data Model — Quan Hệ Chính

Bảng dưới mô tả các quan hệ then chốt giữa các entity. Schema đầy đủ được định nghĩa trong file prisma/schema.prisma.

|                |                 |             |                                                    |
|----------------|-----------------|-------------|----------------------------------------------------|
| **Từ**         | **Đến**         | **Quan hệ** | **Ghi chú**                                        |
| **Book**       | **BookCopy**    | 1 — N       | 1 đầu sách có nhiều bản sao vật lý                 |
| **Book**       | **Category**    | N — M       | Qua bảng book_categories                           |
| **Book**       | **Author**      | N — M       | Qua bảng book_authors                              |
| **BookCopy**   | **LoanRecord**  | 1 — N       | 1 bản sao có nhiều lịch sử mượn theo thời gian     |
| **Member**     | **LoanRecord**  | 1 — N       | 1 member có nhiều lần mượn                         |
| **LoanRecord** | **FineRecord**  | 1 — N       | 1 lần mượn có tối đa N ngày phạt (1 record / ngày) |
| **Member**     | **Reservation** | 1 — N       | 1 member có thể đặt trước nhiều đầu sách khác nhau |
| **Book**       | **Reservation** | 1 — N       | 1 đầu sách có 1 hàng chờ (nhiều reservation)       |
| **Member**     | **LoanPolicy**  | N — 1       | Nhiều member cùng role dùng chung 1 policy         |

## 7. API Endpoints — Tổng Hợp

Tất cả endpoint theo chuẩn RESTful. Base URL: /api/v1. Authentication: Bearer JWT trong Authorization header.

|            |                        |                              |               |                 |
|------------|------------------------|------------------------------|---------------|-----------------|
| **Method** | **Path**               | **Mô tả**                    | **Auth**      | **Module**      |
| **POST**   | /auth/login            | Đăng nhập, trả JWT           | Public        | **Member**      |
| **POST**   | /auth/refresh          | Refresh access token         | Refresh token | **Member**      |
| **GET**    | /books                 | Tìm kiếm, lọc danh sách sách | Public        | **Catalog**     |
| **GET**    | /books/:id             | Chi tiết đầu sách + bản sao  | Public        | **Catalog**     |
| **POST**   | /books                 | Thêm đầu sách mới            | Librarian     | **Catalog**     |
| **PATCH**  | /books/:id             | Cập nhật thông tin sách      | Librarian     | **Catalog**     |
| **DELETE** | /books/:id             | Soft delete đầu sách         | Librarian     | **Catalog**     |
| **GET**    | /members/me            | Thông tin cá nhân            | Member        | **Member**      |
| **GET**    | /members               | Danh sách member             | Librarian     | **Member**      |
| **POST**   | /members               | Tạo tài khoản member         | Librarian     | **Member**      |
| **PATCH**  | /members/:id/suspend   | Khoá / mở tài khoản          | Librarian     | **Member**      |
| **POST**   | /loans/checkout        | Mượn sách (scan barcode)     | Librarian     | **Loan**        |
| **POST**   | /loans/:id/return      | Trả sách                     | Librarian     | **Loan**        |
| **POST**   | /loans/:id/renew       | Gia hạn mượn                 | Member+Lib    | **Loan**        |
| **GET**    | /loans/me              | Lịch sử mượn của bản thân    | Member        | **Loan**        |
| **POST**   | /reservations          | Đặt trước một đầu sách       | Member        | **Reservation** |
| **DELETE** | /reservations/:id      | Huỷ đặt trước                | Member+Lib    | **Reservation** |
| **GET**    | /fines/me              | Phạt của bản thân            | Member        | **Fine**        |
| **POST**   | /fines/:id/pay         | Ghi nhận thanh toán phạt     | Librarian     | **Fine**        |
| **GET**    | /reports/overdue       | Danh sách đang quá hạn       | Librarian     | **Report**      |
| **GET**    | /reports/loans/summary | Thống kê mượn/trả            | Librarian     | **Report**      |

## 8. Lộ Trình Triển Khai

|              |               |                                                                   |                          |
|--------------|---------------|-------------------------------------------------------------------|--------------------------|
| **Sprint**   | **Thời gian** | **Deliverables**                                                  | **Milestone**            |
| **Sprint 1** | Tuần 1–2      | DB schema, Auth (JWT), Member CRUD, LoanPolicy setup              | **Auth & Member done**   |
| **Sprint 2** | Tuần 3–4      | Catalog (Book + BookCopy), tìm kiếm, quản lý bản sao              | **Catalog live**         |
| **Sprint 3** | Tuần 5–6      | Loan: checkout, return, renewal; block logic                      | **Core loan flow done**  |
| **Sprint 4** | Tuần 7–8      | Reservation queue + hold expiry; Notification email               | **Reservation + Notify** |
| **Sprint 5** | Tuần 9–10     | Fine: cron job, tính phạt, thanh toán; idempotent design          | **Fine system live**     |
| **Sprint 6** | Tuần 11–12    | Report module; xuất Excel/PDF; Admin dashboard; E2E testing + UAT | **Production ready**     |

## 9. Rủi Ro & Giải Pháp

|                                  |                |                               |                                                            |
|----------------------------------|----------------|-------------------------------|------------------------------------------------------------|
| **Rủi ro**                       | **Mức độ**     | **Xác suất**                  | **Giải pháp**                                              |
| **Duplicate fine record**        | **Cao**        | Có thể xảy ra                 | UNIQUE constraint (loanId, overdue_date) + cron idempotent |
| **Race condition — reservation** | **Cao**        | Xảy ra khi nhiều trả cùng lúc | Row-level lock hoặc pessimistic lock khi assign hold       |
| **Email spam**                   | **Trung bình** | Nếu cron lặp                  | Notification log + deduplicate: 1 email/event/member/ngày  |
| **Copy mất barcode**             | **Thấp**       | Xảy ra thực tế                | Cho phép lookup theo copyId và qua BookId khi barcode lỗi  |
| **Cron job timeout**             | **Trung bình** | Với nhiều record              | Chunk processing: xử lý 100 record/batch, retry on fail    |

*Tài liệu này là bản Draft. Mọi thay đổi cần được phê duyệt bởi Tech Lead và Product Owner.*

---

## 10. Business Rules

Tổng hợp toàn bộ quy tắc nghiệp vụ của hệ thống. Mỗi rule có mã duy nhất để truy vết từ Use Case và code.

### 10.1 Quy tắc Catalog

| **ID** | **Quy tắc** | **Mô tả chi tiết** | **Tham chiếu** |
|--------|-------------|---------------------|-----------------|
| **BR-CAT-01** | ISBN duy nhất | Mỗi đầu sách phải có ISBN duy nhất trong hệ thống (10 hoặc 13 ký tự). Không cho phép tạo Book trùng ISBN. | CAT-01 |
| **BR-CAT-02** | Barcode tự sinh | Barcode của BookCopy được sinh tự động theo quy tắc `LIB-{bookId}-{copyIndex}-{checksum}`, không cho nhập thủ công. | CAT-01 |
| **BR-CAT-03** | Soft delete ràng buộc | Không cho phép soft delete Book nếu còn BookCopy đang có status = `borrowed`. Phải trả tất cả sách trước. | CAT-04 |
| **BR-CAT-04** | Trạng thái BookCopy hợp lệ | BookCopy chỉ có thể ở 1 trong 5 trạng thái: `available`, `borrowed`, `reserved`, `damaged`, `lost`. Chuyển đổi phải tuân theo state machine. | CAT-05 |

### 10.2 Quy tắc Member

| **ID** | **Quy tắc** | **Mô tả chi tiết** | **Tham chiếu** |
|--------|-------------|---------------------|-----------------|
| **BR-MEM-01** | Email duy nhất | Email dùng để đăng nhập phải duy nhất trên toàn hệ thống. | MEM-01 |
| **BR-MEM-02** | Mã SV/NV duy nhất | Mã sinh viên hoặc mã nhân viên không được trùng lặp. | MEM-01 |
| **BR-MEM-03** | Password policy | Password tối thiểu 8 ký tự, phải có ít nhất 1 chữ hoa và 1 chữ số. Hash bằng bcrypt (cost factor = 12). | MEM-02 |
| **BR-MEM-04** | Tài khoản suspended | Member với status = `suspended` vẫn có thể đăng nhập (xem lịch sử, phạt) nhưng không thể: mượn sách, gia hạn, đặt trước. | MEM-03 |
| **BR-MEM-05** | Policy không hồi tố | Thay đổi LoanPolicy chỉ áp dụng cho loan mới. LoanRecord hiện tại giữ nguyên dueDate, maxRenewals đã set ban đầu. | MEM-04 |

### 10.3 Quy tắc Loan

| **ID** | **Quy tắc** | **Mô tả chi tiết** | **Tham chiếu** |
|--------|-------------|---------------------|-----------------|
| **BR-LOAN-01** | Giới hạn mượn | Số sách đang mượn (status = ACTIVE hoặc OVERDUE) không được vượt maxBooks theo LoanPolicy của role. | LOAN-01 |
| **BR-LOAN-02** | DueDate tính theo LoanPolicy | dueDate = checkoutDate + loanDays (theo LoanPolicy của role tại thời điểm checkout). | LOAN-01 |
| **BR-LOAN-03** | Gia hạn có điều kiện | Gia hạn chỉ được phép khi: (a) status = ACTIVE, (b) renewCount < maxRenewals, (c) không có Reservation WAITING cho cùng Book. | LOAN-03, RES-06 |
| **BR-LOAN-04** | Gia hạn cộng dồn | dueDate mới = dueDate cũ + renewDays (không phải từ ngày hiện tại). | LOAN-03 |
| **BR-LOAN-05** | Block khi nợ phạt | Member bị block mượn khi tổng fine UNPAID ≥ ngưỡng (mặc định 50.000đ). Unblock tự động khi tổng < ngưỡng. | LOAN-05 |
| **BR-LOAN-06** | Không mượn trùng đầu sách | Một Member không được mượn 2 bản sao khác nhau của cùng 1 đầu sách cùng lúc (tuỳ chọn cấu hình). | LOAN-01 |

### 10.4 Quy tắc Reservation

| **ID** | **Quy tắc** | **Mô tả chi tiết** | **Tham chiếu** |
|--------|-------------|---------------------|-----------------|
| **BR-RES-01** | Chỉ đặt khi hết sách | Chỉ cho phép đặt trước khi toàn bộ BookCopy của Book có status ≠ `available`. | RES-01 |
| **BR-RES-02** | Không trùng đặt trước | Mỗi Member chỉ có tối đa 1 Reservation active (WAITING/NOTIFIED/HOLD) cho 1 đầu sách. | RES-01 |
| **BR-RES-03** | Hold expiry 48h | Sau khi notify, Member có 48h để đến nhận. Hết hạn → Reservation = EXPIRED, xét người tiếp theo. | RES-04 |
| **BR-RES-04** | Queue FIFO | Hàng chờ đặt trước theo nguyên tắc First In First Out (queuePosition tăng dần theo thời gian). | RES-01, RES-03 |
| **BR-RES-05** | Chặn gia hạn | Nếu có Reservation WAITING cho Book → không cho phép gia hạn bất kỳ LoanRecord nào của Book đó. | RES-06 |

### 10.5 Quy tắc Fine

| **ID** | **Quy tắc** | **Mô tả chi tiết** | **Tham chiếu** |
|--------|-------------|---------------------|-----------------|
| **BR-FINE-01** | Idempotent | UNIQUE constraint (loanId, overdue_date) đảm bảo mỗi ngày quá hạn chỉ có 1 FineRecord. Cron chạy lại không tạo trùng. | FINE-01 |
| **BR-FINE-02** | FineRate theo ngày hiệu lực | Sử dụng FineRate có effectiveFrom ≤ overdue_date, ORDER BY effectiveFrom DESC LIMIT 1. | FINE-01 |
| **BR-FINE-03** | Ngưỡng block | Mặc định 50.000đ. Admin có thể thay đổi. Khi tổng UNPAID ≥ ngưỡng → auto block. | FINE-05 |
| **BR-FINE-04** | Miễn giảm phải có lý do | Mọi thao tác WAIVE phải ghi waivedBy (actorId) + note (lý do, ≥ 10 ký tự). | FINE-04 |
| **BR-FINE-05** | Fine cho sách mất | Khi BookCopy = lost → tạo FineRecord đặc biệt với amount = bookValue hoặc hệ số × bookValue. | LOAN-06 |

### 10.6 Quy tắc Notification

| **ID** | **Quy tắc** | **Mô tả chi tiết** | **Tham chiếu** |
|--------|-------------|---------------------|-----------------|
| **BR-NOTI-01** | Deduplicate | Mỗi sự kiện chỉ gửi tối đa 1 email/member/ngày. Kiểm tra qua notification_log trước khi gửi. | NOTI-01, NOTI-02 |
| **BR-NOTI-02** | Async queue | Tất cả email được đẩy vào BullMQ queue, không gửi đồng bộ trong request. | Tất cả NOTI |
| **BR-NOTI-03** | Retry policy | Email gửi thất bại → retry 3 lần với backoff (1, 5, 15 phút). Sau 3 lần vẫn lỗi → ghi log, không retry nữa. | Tất cả NOTI |

---

## 11. Yêu Cầu Bảo Mật Chi Tiết

### 11.1 Xác thực (Authentication)

| **Tiêu chí** | **Chi tiết** |
|---------------|-------------|
| **Thuật toán JWT** | HS256 (hoặc RS256 nếu cần verify bên ngoài); secret key ≥ 256 bit |
| **Access Token TTL** | 15 phút; chứa payload: `{ memberId, role, iat, exp }` |
| **Refresh Token TTL** | 7 ngày; opaque token lưu trong database; httpOnly cookie |
| **Rotation** | Mỗi lần refresh → sinh cặp token mới + vô hiệu hoá token cũ |
| **Token reuse detection** | Nếu Refresh Token cũ bị reuse → thu hồi toàn bộ Refresh Token của member (phát hiện theft) |
| **Password hashing** | bcrypt, cost factor = 12 |
| **Brute force protection** | Khoá đăng nhập 30 phút sau 5 lần sai liên tiếp trong 15 phút |

### 11.2 Phân quyền (Authorization) — RBAC Matrix

| **Tài nguyên / Thao tác** | **Public** | **Student** | **Lecturer** | **Librarian** | **Admin** |
|---------------------------|:----------:|:-----------:|:------------:|:-------------:|:---------:|
| Tìm kiếm sách | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem chi tiết sách | ✅ | ✅ | ✅ | ✅ | ✅ |
| Thêm / sửa / xoá sách | ❌ | ❌ | ❌ | ✅ | ✅ |
| Import CSV | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem thông tin cá nhân | ❌ | ✅ | ✅ | ✅ | ✅ |
| Quản lý member | ❌ | ❌ | ❌ | ✅ | ✅ |
| Khoá / mở khoá member | ❌ | ❌ | ❌ | ✅ | ✅ |
| Checkout / trả sách | ❌ | ❌ | ❌ | ✅ | ❌ |
| Gia hạn (của bản thân) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Xem lịch sử mượn (bản thân) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Xem lịch sử mượn (người khác) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Đặt trước sách | ❌ | ✅ | ✅ | ❌ | ❌ |
| Huỷ đặt trước (bản thân) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Huỷ đặt trước (người khác) | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem phạt (bản thân) | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ghi nhận thanh toán phạt | ❌ | ❌ | ❌ | ✅ | ✅ |
| Miễn giảm phạt | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem báo cáo | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xuất Excel/PDF | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cấu hình LoanPolicy / FineRate | ❌ | ❌ | ❌ | ❌ | ✅ |
| Quản lý tài khoản thủ thư | ❌ | ❌ | ❌ | ❌ | ✅ |

### 11.3 Bảo mật API

| **Tiêu chí** | **Chi tiết** |
|---------------|-------------|
| **Rate Limiting** | 100 requests/phút cho API thông thường; 10 requests/phút cho /auth/login; 5 requests/phút cho /auth/refresh |
| **CORS** | Chỉ cho phép origin từ domain frontend chính thức; không dùng wildcard (*) |
| **Input Validation** | Validate tất cả input bằng Joi/Zod ở controller layer; reject request có trường không mong đợi |
| **SQL Injection** | Sử dụng parameterized queries qua ORM (Prisma/TypeORM); không bao giờ nối string trực tiếp vào query |
| **XSS Prevention** | Sanitize output; set Content-Type header; helmet middleware cho Express |
| **CSRF** | Sử dụng SameSite=Strict cho cookie; CSRF token cho form submissions |
| **HTTPS** | Bắt buộc HTTPS trên production; redirect HTTP → HTTPS |
| **Helmet** | Sử dụng helmet middleware: X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security |
| **Sensitive data** | Không log password, token trong log; mask email/phone trong response public |

### 11.4 Bảo mật Dữ liệu

| **Tiêu chí** | **Chi tiết** |
|---------------|-------------|
| **Encryption at rest** | Database encryption (PostgreSQL pgcrypto cho trường nhạy cảm nếu cần) |
| **Backup** | Full backup hàng ngày lúc 02:00; giữ 30 ngày; backup được mã hoá |
| **Audit trail** | Mọi thao tác write ghi vào audit_log: actorId, action, entity, entityId, timestamp, before/after JSON |
| **PII handling** | Dữ liệu cá nhân (email, phone, tên) chỉ hiển thị cho chính chủ hoặc Thủ thư/Admin |

---

## 12. Error Handling & Error Codes

### 12.1 Chuẩn Error Response

Tất cả API endpoint trả về lỗi theo format thống nhất:

```json
{
  "success": false,
  "error": {
    "code": "ERR_LOAN_MAX_BOOKS",
    "message": "Bạn đã đạt số sách mượn tối đa (3/3). Vui lòng trả sách trước khi mượn thêm.",
    "details": {
      "currentLoans": 3,
      "maxBooks": 3
    }
  },
  "timestamp": "2026-04-14T10:30:00Z",
  "requestId": "req_abc123"
}
```

HTTP Status Code tuân theo quy ước:

| **Status** | **Ý nghĩa** | **Khi nào dùng** |
|------------|-------------|------------------|
| **400** | Bad Request | Dữ liệu input không hợp lệ (validation error) |
| **401** | Unauthorized | Token hết hạn, không có token, token không hợp lệ |
| **403** | Forbidden | Không có quyền (role không đủ) |
| **404** | Not Found | Resource không tồn tại |
| **409** | Conflict | Trùng lặp dữ liệu (ISBN đã tồn tại, email đã dùng) |
| **422** | Unprocessable Entity | Dữ liệu hợp lệ về format nhưng vi phạm business rule |
| **429** | Too Many Requests | Vượt rate limit |
| **500** | Internal Server Error | Lỗi hệ thống không xác định |

### 12.2 Danh sách Error Codes theo Module

#### Auth Module

| **Code** | **HTTP** | **Mô tả** |
|----------|----------|-----------|
| ERR_AUTH_INVALID_CREDENTIALS | 401 | Email hoặc mật khẩu không đúng |
| ERR_AUTH_ACCOUNT_SUSPENDED | 403 | Tài khoản đã bị khoá |
| ERR_AUTH_ACCOUNT_EXPIRED | 403 | Tài khoản đã hết hạn |
| ERR_AUTH_ACCOUNT_PENDING | 403 | Tài khoản chờ phê duyệt |
| ERR_AUTH_TOO_MANY_ATTEMPTS | 429 | Đăng nhập sai quá nhiều lần, thử lại sau 30 phút |
| ERR_AUTH_TOKEN_EXPIRED | 401 | Access Token đã hết hạn |
| ERR_AUTH_TOKEN_INVALID | 401 | Token không hợp lệ |
| ERR_AUTH_REFRESH_INVALID | 401 | Refresh Token không hợp lệ hoặc đã bị thu hồi |
| ERR_AUTH_REFRESH_REUSE | 401 | Phát hiện Refresh Token bị reuse (token theft) |

#### Catalog Module

| **Code** | **HTTP** | **Mô tả** |
|----------|----------|-----------|
| ERR_CAT_ISBN_EXISTS | 409 | ISBN đã tồn tại trong hệ thống |
| ERR_CAT_ISBN_INVALID | 400 | ISBN không đúng định dạng (phải 10 hoặc 13 ký tự) |
| ERR_CAT_BOOK_NOT_FOUND | 404 | Không tìm thấy đầu sách |
| ERR_CAT_BOOK_DELETED | 404 | Đầu sách đã bị xoá |
| ERR_CAT_COPY_NOT_FOUND | 404 | Không tìm thấy bản sao |
| ERR_CAT_COPY_HAS_LOAN | 422 | Bản sao đang được mượn, không thể thay đổi status |
| ERR_CAT_DELETE_HAS_ACTIVE_LOANS | 422 | Không thể xoá sách — còn bản sao đang được mượn |
| ERR_CAT_DELETE_HAS_RESERVATIONS | 422 | Không thể xoá sách — còn đặt trước đang chờ |
| ERR_CAT_IMPORT_INVALID_FORMAT | 400 | File CSV không đúng định dạng |
| ERR_CAT_IMPORT_TOO_LARGE | 422 | File CSV vượt giới hạn (> 10.000 dòng) |

#### Member Module

| **Code** | **HTTP** | **Mô tả** |
|----------|----------|-----------|
| ERR_MEM_EMAIL_EXISTS | 409 | Email đã được sử dụng |
| ERR_MEM_STUDENT_ID_EXISTS | 409 | Mã sinh viên/nhân viên đã tồn tại |
| ERR_MEM_NOT_FOUND | 404 | Không tìm thấy thành viên |
| ERR_MEM_ALREADY_SUSPENDED | 422 | Tài khoản đã ở trạng thái khoá |
| ERR_MEM_ALREADY_ACTIVE | 422 | Tài khoản đã ở trạng thái hoạt động |
| ERR_MEM_WEAK_PASSWORD | 400 | Mật khẩu không đủ mạnh |

#### Loan Module

| **Code** | **HTTP** | **Mô tả** |
|----------|----------|-----------|
| ERR_LOAN_COPY_NOT_AVAILABLE | 422 | Bản sao không ở trạng thái available |
| ERR_LOAN_MEMBER_BLOCKED | 422 | Thành viên bị block do nợ phạt |
| ERR_LOAN_MEMBER_SUSPENDED | 422 | Tài khoản thành viên đã bị khoá |
| ERR_LOAN_MAX_BOOKS | 422 | Đã đạt số sách mượn tối đa |
| ERR_LOAN_DUPLICATE_BOOK | 422 | Đã mượn bản sao khác của cùng đầu sách |
| ERR_LOAN_NOT_FOUND | 404 | Không tìm thấy bản ghi mượn |
| ERR_LOAN_ALREADY_RETURNED | 422 | Sách đã được trả rồi |
| ERR_LOAN_RENEW_OVERDUE | 422 | Không thể gia hạn — sách đang quá hạn |
| ERR_LOAN_RENEW_MAX | 422 | Đã hết lượt gia hạn |
| ERR_LOAN_RENEW_HAS_RESERVATION | 422 | Không thể gia hạn — sách có người đặt trước |

#### Reservation Module

| **Code** | **HTTP** | **Mô tả** |
|----------|----------|-----------|
| ERR_RES_COPY_AVAILABLE | 422 | Còn bản sao sẵn sàng — không cần đặt trước |
| ERR_RES_ALREADY_RESERVED | 422 | Đã đặt trước đầu sách này rồi |
| ERR_RES_NOT_FOUND | 404 | Không tìm thấy đặt trước |
| ERR_RES_CANNOT_CANCEL | 422 | Không thể huỷ — đặt trước đã hoàn tất hoặc hết hạn |
| ERR_RES_MEMBER_BLOCKED | 422 | Thành viên bị block — không thể đặt trước |

#### Fine Module

| **Code** | **HTTP** | **Mô tả** |
|----------|----------|-----------|
| ERR_FINE_NOT_FOUND | 404 | Không tìm thấy bản ghi phạt |
| ERR_FINE_ALREADY_PAID | 422 | Khoản phạt đã được thanh toán |
| ERR_FINE_ALREADY_WAIVED | 422 | Khoản phạt đã được miễn giảm |
| ERR_FINE_WAIVE_REASON_SHORT | 400 | Lý do miễn giảm phải ≥ 10 ký tự |

---

## 13. Giao Diện Người Dùng — Mô Tả Layout

### 13.1 Nguyên tắc thiết kế chung

- **Responsive**: Giao diện hoạt động tốt trên desktop (≥ 1024px) và mobile (≥ 375px)
- **Font**: Sử dụng font sans-serif (Inter hoặc Roboto), kích thước tối thiểu 14px
- **Màu sắc**: Primary (#1E40AF — xanh đậm), Secondary (#059669 — xanh lá), Danger (#DC2626 — đỏ), Warning (#D97706 — vàng cam)
- **Sidebar + Top bar**: Layout quản trị dùng sidebar cố định bên trái + topbar chứa user info
- **WCAG 2.1 AA**: Contrast ratio tối thiểu 4.5:1 cho text; focus indicator rõ ràng cho keyboard navigation

### 13.2 Các màn hình chính — Giao diện Thủ thư

#### Màn hình 1: Dashboard Thủ thư

- **Layout**: Topbar (logo, thông báo, avatar) + Sidebar (menu) + Main content
- **Nội dung**:
  - 4 card thống kê nhanh: Tổng sách đang mượn | Sách quá hạn hôm nay | Đặt trước đang chờ | Phạt chưa thu (VNĐ)
  - Bảng "Sách quá hạn" (top 10, sắp xếp theo ngày quá hạn giảm dần) + nút "Xem tất cả"
  - Biểu đồ cột: Lượt mượn/trả 7 ngày gần nhất
  - Khu vực "Thao tác nhanh": Mượn sách (scan) | Trả sách (scan) | Thêm thành viên

#### Màn hình 2: Quản lý Catalog

- **Layout**: Thanh tìm kiếm (full-text) + bộ lọc (thể loại, tình trạng, tác giả) + nút "Thêm sách" + nút "Import CSV"
- **Danh sách**: Bảng dạng card hoặc list view (toggle), phân trang 20 items
- **Mỗi item**: Ảnh bìa (thumbnail), tên sách, tác giả, ISBN, thể loại, X/Y available, nút Xem | Sửa | Xoá
- **Chi tiết sách**: Modal hoặc trang riêng hiển thị toàn bộ thông tin Book + bảng BookCopy (barcode, status, vị trí kệ, dueDate nếu đang mượn)

#### Màn hình 3: Mượn sách (Checkout)

- **Layout**: 2 cột
  - Cột trái: Input scan memberCardNo → hiển thị thông tin Member (tên, role, sách đang mượn/max, tổng phạt)
  - Cột phải: Input scan barcode sách → hiển thị tên sách + validation result (✅ / ❌ kèm lý do)
- **Giỏ mượn**: Danh sách sách đã scan (cho phép mượn nhiều cuốn 1 lượt) + nút "Xác nhận mượn"
- **Kết quả**: Phiếu mượn hiển thị danh sách + nút In phiếu

#### Màn hình 4: Trả sách (Return)

- **Layout**: 1 cột chính
  - Input scan barcode → hệ thống tự hiển thị thông tin mượn
  - Hiển thị: tên sách, người mượn, ngày mượn, ngày hạn, tình trạng (badge: Đúng hạn ✅ / Quá hạn ⚠️ + số ngày)
  - Nếu quá hạn: hiển thị bảng phạt phát sinh
- **Nút**: Xác nhận trả | Báo hư hỏng | Báo mất

#### Màn hình 5: Quản lý Thành viên

- **Layout**: Thanh tìm kiếm (tên, email, mã SV) + bộ lọc (role, status) + nút "Thêm thành viên"
- **Danh sách**: Bảng: Tên | Email | Role | Status badge | Sách đang mượn | Phạt chưa TT | Thao tác (Xem | Khoá/Mở)
- **Chi tiết Member**: Trang riêng: thông tin cá nhân, lịch sử mượn, phạt, đặt trước

#### Màn hình 6: Quản lý Phạt

- **Layout**: Tìm kiếm member + bộ lọc (status: UNPAID/PAID/WAIVED)
- **Danh sách**: Bảng FineRecord: Tên sách | Ngày quá hạn | Số tiền | Status badge | Thao tác
- **Thao tác**: Thanh toán (chọn nhiều) | Miễn giảm (nhập lý do) | In biên lai

### 13.3 Các màn hình chính — Giao diện Độc giả

#### Màn hình 7: Trang chủ Độc giả

- **Layout**: Topbar đơn giản (logo, tìm kiếm, avatar/đăng nhập) + Main content
- **Nội dung**:
  - Hero section: Thanh tìm kiếm lớn + gợi ý phổ biến
  - "Sách mới nhất": carousel ảnh bìa + tên sách
  - "Sách phổ biến": grid 3–4 cột ảnh bìa

#### Màn hình 8: Kết quả tìm kiếm

- **Layout**: Sidebar lọc (trái: thể loại, tình trạng, tác giả, năm XB) + Grid kết quả (phải)
- **Mỗi item**: Card với ảnh bìa, tên sách, tác giả, badge "Có sẵn" / "Hết" / "Đặt trước", nút Xem

#### Màn hình 9: Trang cá nhân (My Account)

- **Layout**: Tab navigation: Sách đang mượn | Lịch sử | Đặt trước | Phạt | Hồ sơ
- **Tab "Sách đang mượn"**: Danh sách card: tên sách, ngày hạn, badge (Còn X ngày / Quá hạn), nút Gia hạn
- **Tab "Đặt trước"**: Danh sách reservation + vị trí hàng chờ + trạng thái + nút Huỷ
- **Tab "Phạt"**: Dashboard tóm tắt + danh sách chi tiết (giống UC–FINE-02)

---

## 14. Constraints & Assumptions (Ràng buộc & Giả định)

### 14.1 Giả định (Assumptions)

| **ID** | **Giả định** |
|--------|-------------|
| **A-01** | Hệ thống phục vụ 1 thư viện duy nhất (single branch). Quản lý đa chi nhánh nằm ngoài phạm vi. |
| **A-02** | Mỗi sinh viên/giảng viên có email trường duy nhất và hợp lệ để nhận thông báo. |
| **A-03** | Thủ thư có máy tính với đầu đọc barcode USB; barcode reader hoạt động như keyboard input. |
| **A-04** | Kết nối Internet tại thư viện ổn định (uptime ≥ 99%). Hệ thống không hỗ trợ chế độ offline. |
| **A-05** | Số lượng sách tối đa: 50.000 đầu sách, 200.000 bản sao. Số thành viên tối đa: 20.000. |
| **A-06** | Thanh toán phạt chỉ xử lý trực tiếp tại quầy (tiền mặt). Không tích hợp payment gateway. |
| **A-07** | Email SMTP server (hoặc SendGrid) được cấu hình sẵn và có quota đủ (ước tính ~500 email/ngày). |
| **A-08** | Browser support: Chrome, Firefox, Safari, Edge — 2 phiên bản mới nhất. Không hỗ trợ IE. |

### 14.2 Ràng buộc (Constraints)

| **ID** | **Ràng buộc** | **Loại** |
|--------|--------------|----------|
| **C-01** | Triển khai trên VPS với specs tối thiểu: 4 vCPU, 8GB RAM, 100GB SSD | Hạ tầng |
| **C-02** | Database PostgreSQL 16; không sử dụng database khác cho dữ liệu chính | Kỹ thuật |
| **C-03** | API phải tương thích RESTful; không dùng GraphQL | Kỹ thuật |
| **C-04** | Code viết bằng TypeScript/JavaScript; runtime Node.js 20 LTS | Kỹ thuật |
| **C-05** | Không lưu file upload > 5MB (ảnh bìa sách); resize về tối đa 800×1200px | Kỹ thuật |
| **C-06** | Hệ thống phải tuân thủ quy định bảo mật dữ liệu cá nhân theo luật ATTT Việt Nam | Pháp lý |
| **C-07** | Ngôn ngữ giao diện: Tiếng Việt (không yêu cầu đa ngôn ngữ cho phiên bản đầu) | Nghiệp vụ |
| **C-08** | Timezone: Asia/Ho_Chi_Minh (UTC+7); tất cả thời gian lưu UTC trong database, hiển thị theo timezone người dùng | Kỹ thuật |

---

## 15. Acceptance Criteria (Tiêu chí nghiệm thu)

### 15.1 Catalog

| **AC ID** | **Requirement** | **Tiêu chí** |
|-----------|----------------|--------------|
| **AC-CAT-01a** | CAT-01 | Thêm sách với đầy đủ thông tin hợp lệ → Book và N BookCopy được tạo thành công; mỗi copy có barcode duy nhất |
| **AC-CAT-01b** | CAT-01 | Thêm sách với ISBN đã tồn tại → Hệ thống từ chối, hiển thị lỗi ERR_CAT_ISBN_EXISTS |
| **AC-CAT-02a** | CAT-02 | Tìm kiếm "harry potter" → Kết quả chứa các sách có title/author match; response < 500ms |
| **AC-CAT-02b** | CAT-02 | Tìm kiếm với bộ lọc thể loại "Khoa học" + tình trạng "available" → Chỉ hiển thị sách thoả mãn cả 2 điều kiện |
| **AC-CAT-03a** | CAT-03 | Cập nhật tiêu đề sách → Thông tin mới được lưu; audit_log ghi nhận before/after |
| **AC-CAT-04a** | CAT-04 | Soft delete sách không có copy đang mượn → is_deleted=true; sách không xuất hiện trong tìm kiếm mặc định |
| **AC-CAT-04b** | CAT-04 | Soft delete sách có copy đang mượn → Hệ thống từ chối, hiển thị lỗi |
| **AC-CAT-06a** | CAT-06 | Import CSV 100 dòng hợp lệ → 100 sách được tạo; hiển thị báo cáo thành công |
| **AC-CAT-06b** | CAT-06 | Import CSV có 5 dòng ISBN trùng → 5 dòng bị bỏ qua; còn lại import thành công; báo cáo lỗi chi tiết |

### 15.2 Member & Auth

| **AC ID** | **Requirement** | **Tiêu chí** |
|-----------|----------------|--------------|
| **AC-MEM-01a** | MEM-01 | Thủ thư tạo tài khoản sinh viên → Account active ngay; email chào mừng được gửi |
| **AC-MEM-01b** | MEM-01 | Sinh viên đăng ký online → Account ở trạng thái pending; đợi Thủ thư duyệt mới active |
| **AC-MEM-02a** | MEM-02 | Đăng nhập đúng email+password → Nhận Access Token (15 phút) + Refresh Token (7 ngày) |
| **AC-MEM-02b** | MEM-02 | Đăng nhập sai password 5 lần liên tiếp → Tài khoản bị khoá tạm 30 phút |
| **AC-MEM-02c** | MEM-02 | Gọi API với Access Token hết hạn → Trả 401; dùng Refresh Token để lấy token mới thành công |
| **AC-MEM-03a** | MEM-03 | Khoá tài khoản → Member không thể checkout sách mới; vẫn đăng nhập xem lịch sử được |

### 15.3 Loan

| **AC ID** | **Requirement** | **Tiêu chí** |
|-----------|----------------|--------------|
| **AC-LOAN-01a** | LOAN-01 | Checkout sách available cho member active chưa đạt max → LoanRecord ACTIVE; BookCopy = borrowed |
| **AC-LOAN-01b** | LOAN-01 | Checkout khi member đã đạt maxBooks → Từ chối, lỗi ERR_LOAN_MAX_BOOKS |
| **AC-LOAN-01c** | LOAN-01 | Checkout khi member bị block → Từ chối, lỗi ERR_LOAN_MEMBER_BLOCKED |
| **AC-LOAN-02a** | LOAN-02 | Trả sách đúng hạn → status = RETURNED; BookCopy = available; không tạo FineRecord |
| **AC-LOAN-02b** | LOAN-02 | Trả sách quá hạn 3 ngày → status = RETURNED; 3 FineRecord được tạo (1/ngày) |
| **AC-LOAN-02c** | LOAN-02 | Trả sách có Reservation đang chờ → BookCopy = reserved; gửi email cho người đặt trước |
| **AC-LOAN-03a** | LOAN-03 | Gia hạn lần 1 (max=1) → dueDate cộng thêm renewDays; renewCount = 1 |
| **AC-LOAN-03b** | LOAN-03 | Gia hạn lần 2 khi max = 1 → Từ chối, lỗi ERR_LOAN_RENEW_MAX |
| **AC-LOAN-03c** | LOAN-03 | Gia hạn khi có Reservation WAITING → Từ chối, lỗi ERR_LOAN_RENEW_HAS_RESERVATION |

### 15.4 Reservation

| **AC ID** | **Requirement** | **Tiêu chí** |
|-----------|----------------|--------------|
| **AC-RES-01a** | RES-01 | Đặt trước khi 0 copy available → Reservation WAITING; queuePosition = max+1 |
| **AC-RES-01b** | RES-01 | Đặt trước khi còn copy available → Từ chối, lỗi ERR_RES_COPY_AVAILABLE |
| **AC-RES-03a** | RES-03 | Trả sách có Reservation → Reservation đầu hàng → NOTIFIED; email gửi trong 5 phút |
| **AC-RES-04a** | RES-04 | Sau 48h không nhận → Reservation EXPIRED; người tiếp theo được notify (hoặc copy = available) |
| **AC-RES-05a** | RES-05 | Huỷ Reservation WAITING vị trí #2 → queuePosition của vị trí #3, #4… đều giảm 1 |

### 15.5 Fine

| **AC ID** | **Requirement** | **Tiêu chí** |
|-----------|----------------|--------------|
| **AC-FINE-01a** | FINE-01 | Sách quá hạn 5 ngày → Cron tạo đúng 5 FineRecord (1/ngày); chạy lại cron → không tạo thêm (idempotent) |
| **AC-FINE-03a** | FINE-03 | Thanh toán 3 FineRecord → status = PAID; paidAt được ghi; tổng UNPAID giảm tương ứng |
| **AC-FINE-05a** | FINE-05 | Tổng fine UNPAID từ 40K lên 55K (vượt ngưỡng 50K) → member.is_blocked = true; email gửi |
| **AC-FINE-05b** | FINE-05 | Thanh toán bớt fine → tổng còn 45K (dưới ngưỡng) → member.is_blocked = false; email gửi |

### 15.6 Notification

| **AC ID** | **Requirement** | **Tiêu chí** |
|-----------|----------------|--------------|
| **AC-NOTI-01a** | NOTI-01 | Sách còn 3 ngày đến hạn → Email nhắc nhở được gửi; kiểm tra notification_log có record |
| **AC-NOTI-01b** | NOTI-01 | Cron chạy lại trong ngày → Không gửi email trùng (deduplicate hoạt động) |
| **AC-NOTI-03a** | NOTI-03 | Reservation notify → Email gửi trong 5 phút; nội dung có holdExpiryAt chính xác |

### 15.7 Report

| **AC ID** | **Requirement** | **Tiêu chí** |
|-----------|----------------|--------------|
| **AC-RPT-01a** | RPT-01 | Xem báo cáo mượn/trả tháng 3/2026 → Số liệu khớp với LoanRecord trong database |
| **AC-RPT-02a** | RPT-02 | Danh sách quá hạn → Hiển thị đúng tất cả OVERDUE records; sắp xếp đúng thứ tự |
| **AC-RPT-06a** | RPT-06 | Xuất Excel báo cáo mượn/trả → File .xlsx tải về, mở được, dữ liệu khớp với hiển thị trên web |

---

## 16. Lịch Sử Phiên Bản (Revision History)

| **Phiên bản** | **Ngày** | **Tác giả** | **Mô tả thay đổi** |
|---------------|----------|-------------|---------------------|
| 1.0 | 14/04/2026 | — | Bản Draft ban đầu: tổng quan, 7 domain, NFR, kiến trúc, data model, API, lộ trình, rủi ro |
| 1.1 | 14/04/2026 | — | Bổ sung: Mục lục chi tiết, Use Case chi tiết cho toàn bộ 33 requirements (CAT, MEM, LOAN, RES, FINE, NOTI, RPT), Business Rules (BR-xx), Security chi tiết (RBAC Matrix, API Security), Error Handling & Error Codes, Mô tả giao diện (9 màn hình), Constraints & Assumptions, Acceptance Criteria, Revision History |

---

*Tài liệu này là bản Draft v1.1. Mọi thay đổi cần được phê duyệt bởi Tech Lead và Product Owner.*
