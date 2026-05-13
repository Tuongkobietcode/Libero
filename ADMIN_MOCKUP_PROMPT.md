# Prompt tạo mockup UI Admin LIBERO

Bạn là UI/UX designer cấp senior. Hãy tạo mockup giao diện web admin cho hệ thống quản lý thư viện **LIBERO**. Mục tiêu là thiết kế các màn hình admin/thủ thư để vận hành nghiệp vụ thật, không phải landing page.

## Bối cảnh hệ thống

LIBERO là hệ thống quản lý thư viện gồm 2 khu vực:

- **Reader app**: dành cho độc giả, chỉ xem sách, tìm kiếm, xem khoản mượn của mình, đặt chỗ, xem tiền phạt, hồ sơ.
- **Admin app**: dành cho thủ thư và quản trị viên, dùng để quản lý sách, độc giả, khoản mượn, đặt chỗ, tiền phạt, báo cáo và cấu hình.

Mockup cần tập trung vào **Admin app**.

## Vai trò người dùng admin

- **Librarian / Thủ thư**
  - tạo khoản mượn cho độc giả tại quầy
  - xử lý trả sách
  - xem danh sách khoản mượn
  - xử lý sách quá hạn, sách mất
  - quản lý đặt chỗ
  - xử lý tiền phạt
  - quản lý sách, bản sao, độc giả

- **Admin / Quản trị viên**
  - có toàn quyền của thủ thư
  - quản lý người dùng nội bộ
  - cấu hình chính sách mượn
  - cấu hình mức phạt
  - xem nhật ký hệ thống

## Visual style đã chọn

Thiết kế theo phong cách dashboard hiện đại, sạch, chuyên nghiệp:

- Sidebar cố định bên trái, nền trắng.
- Logo LIBERO ở góc trên trái.
- Header trên cùng có tiêu đề trang, search nhanh, notification, icon theme.
- Content nền xám rất nhạt `#f7f9fc`.
- Card trắng, bo góc 16-20px, border `#e5e7eb`, shadow nhẹ.
- Primary color: xanh tím/indigo `#3157ff` hoặc `#4f46e5`.
- Text chính: navy/near-black `#071026`.
- Text phụ: slate gray.
- Icon stroke mảnh, nhất quán, không dùng emoji.
- UI dày thông tin vừa phải, phù hợp công cụ vận hành hằng ngày.
- Không dùng hero marketing, không dùng gradient orb/bokeh trang trí.
- Không làm card lồng card.

## Sidebar menu mong muốn

Giữ cách đặt tên menu như sau:

```text
Tổng quan

QUẢN LÝ
- Sách
- Danh mục
- Tác giả
- Nhà xuất bản
- Độc giả
- Thẻ thư viện
- Khoản mượn
- Đặt chỗ
- Phạt

HỆ THỐNG
- Người dùng
- Vai trò & Phân quyền
- Cài đặt
- Nhật ký hệ thống
```

## Dashboard đã có hướng thiết kế

Màn **Tổng quan** đã có concept:

- 4 KPI cards:
  - Tổng sách
  - Độc giả
  - Đang mượn
  - Tiền phạt chờ thu
- Chart thống kê mượn/trả.
- Sách mượn nhiều nhất.
- Hoạt động gần đây.
- Độc giả mới.

Các màn hình tiếp theo cần giữ cùng visual language.

## Flow nghiệp vụ admin cần thể hiện

### 1. Sách

Admin/thủ thư cần:

- xem danh sách đầu sách
- tìm kiếm theo tên, ISBN, tác giả
- lọc theo danh mục, tình trạng còn bản
- xem số bản sao: tổng bản, còn sẵn, đang mượn, mất/hỏng
- tạo sách mới
- chỉnh sửa sách
- xem chi tiết sách
- quản lý bản sao/copy theo barcode
- import CSV

Màn cần mockup:

1. `Sách - Danh sách`
2. `Sách - Chi tiết`
3. `Sách - Tạo/Sửa`
4. `Sách - Quản lý bản sao`
5. `Sách - Import CSV`

### 2. Độc giả

Admin/thủ thư cần:

- xem danh sách độc giả
- tìm theo tên, email, mã thẻ thư viện, mã sinh viên
- lọc theo trạng thái active/suspended/pending/expired
- tạo độc giả mới
- sửa thông tin
- khóa/mở khóa tài khoản
- xem chi tiết độc giả
- trong chi tiết độc giả cần thấy:
  - thông tin cá nhân
  - khoản mượn hiện tại
  - lịch sử mượn
  - đặt chỗ
  - tiền phạt
  - hoạt động gần đây

Màn cần mockup:

1. `Độc giả - Danh sách`
2. `Độc giả - Chi tiết`
3. `Độc giả - Tạo/Sửa`

### 3. Khoản mượn

Đây là flow quan trọng nhất để tạo data thật cho Reader.

Admin/thủ thư cần:

- tạo khoản mượn tại quầy bằng mã thẻ độc giả + barcode bản sao
- kiểm tra điều kiện mượn:
  - tài khoản active
  - không bị block
  - chưa vượt quá giới hạn số sách
  - bản sao đang available
- xem danh sách khoản mượn
- lọc theo trạng thái: đang mượn, quá hạn, đã trả, mất
- tìm theo độc giả, sách, barcode
- trả sách theo barcode hoặc theo loan id
- gia hạn hộ độc giả nếu đủ điều kiện
- đánh dấu mất sách và sinh phạt
- xem chi tiết khoản mượn

Màn cần mockup:

1. `Khoản mượn - Tạo phiếu mượn`
2. `Khoản mượn - Trả sách`
3. `Khoản mượn - Danh sách`
4. `Khoản mượn - Chi tiết`
5. `Khoản mượn - Quá hạn`

### 4. Đặt chỗ

Reader có thể đặt chỗ khi sách không còn bản available. Admin/thủ thư cần quản lý hàng chờ.

Admin/thủ thư cần:

- xem danh sách đặt chỗ
- lọc theo trạng thái: waiting, notified, fulfilled, cancelled, expired
- xem vị trí hàng chờ
- xem sách và độc giả tương ứng
- hủy đặt chỗ nếu cần
- khi sách được trả, hệ thống có thể chuyển reservation sang notified
- thủ thư cần thấy reservation nào đang chờ độc giả đến nhận sách

Màn cần mockup:

1. `Đặt chỗ - Danh sách`
2. `Đặt chỗ - Chi tiết / Drawer`

### 5. Phạt

Tiền phạt sinh từ trả sách quá hạn hoặc đánh dấu mất sách.

Admin/thủ thư cần:

- xem danh sách khoản phạt
- lọc theo member, trạng thái unpaid/paid/waived
- chọn nhiều khoản unpaid để thanh toán
- miễn phạt với lý do
- xem tổng chưa thanh toán, đã thanh toán, đã miễn
- thấy tác động block/unblock tài khoản khi tổng phạt vượt/ngắn hơn ngưỡng

Màn cần mockup:

1. `Phạt - Danh sách`
2. `Phạt - Thanh toán`
3. `Phạt - Miễn phạt modal`

### 6. Báo cáo / Cài đặt / Hệ thống

Các màn có thể thiết kế sau nhưng cần cùng style:

- Báo cáo mượn trả
- Báo cáo sách phổ biến
- Báo cáo tồn kho
- Báo cáo tiền phạt
- Cấu hình chính sách mượn
- Cấu hình mức phạt
- Người dùng nội bộ
- Vai trò & phân quyền
- Nhật ký hệ thống

## Ưu tiên mockup cần tạo ngay

Hãy tạo mockup theo thứ tự ưu tiên sau:

1. **Khoản mượn - Danh sách**
2. **Khoản mượn - Tạo phiếu mượn**
3. **Khoản mượn - Trả sách**
4. **Đặt chỗ - Danh sách**
5. **Độc giả - Chi tiết**
6. **Phạt - Danh sách**
7. **Sách - Danh sách**
8. **Sách - Chi tiết**

## Yêu cầu output hình ảnh

- Tạo mockup desktop web admin, kích thước 1440x1024 hoặc 1600x1000.
- Luôn hiển thị sidebar và header để giữ ngữ cảnh hệ thống.
- Dữ liệu demo dùng tiếng Việt.
- Nội dung phải đủ thật để designer/dev hiểu workflow, không dùng lorem ipsum.
- Các button chính cần rõ:
  - Tạo phiếu mượn
  - Xử lý trả
  - Đánh dấu mất
  - Thanh toán
  - Miễn phạt
  - Hủy đặt chỗ
  - Tạo mới
  - Import CSV
- Table cần có trạng thái, filter, search, action.
- Trạng thái phải có badge màu:
  - Active/Available/Paid: xanh lá
  - Waiting/Notified/Sắp đến hạn: vàng/cam
  - Overdue/Unpaid/Lost/Blocked: đỏ
  - Returned/Fulfilled/Waived: xanh dương hoặc neutral

## Ràng buộc thiết kế

- Không thiết kế giao diện reader.
- Không thiết kế landing page.
- Không dùng quá nhiều màu rực.
- Không dùng illustration lớn.
- Không dùng chart trang trí nếu không giúp vận hành.
- Không giấu action quan trọng trong menu ba chấm nếu đó là action chính.
- Không dùng text quá nhỏ; tối thiểu 13-14px cho nội dung bảng.
- Table phải scan được nhanh.
- Primary action trên mỗi màn chỉ nên có 1-2 nút nổi bật.

## Mock data gợi ý

Độc giả:

- Nguyễn Văn An - MEM-2026-00001 - student - active
- Trần Thị Bình - MEM-2026-00002 - student - active
- Lê Minh Hoàng - MEM-2026-00003 - lecturer - active
- Phạm Quỳnh Anh - MEM-2026-00004 - student - blocked

Sách:

- Nhà giả kim - Paulo Coelho - ISBN 9786041234567
- Đắc nhân tâm - Dale Carnegie - ISBN 9786047654321
- Sapiens - Lược sử loài người - Yuval Noah Harari
- Dune - Xứ Cát - Frank Herbert
- Atomic Habits - James Clear

Khoản mượn:

- ACTIVE, OVERDUE, RETURNED, LOST
- Barcode ví dụ: LB-000123, LB-000124, LB-000125

Đặt chỗ:

- WAITING, NOTIFIED, FULFILLED, CANCELLED, EXPIRED
- Queue position: #1, #3, #7

Phạt:

- UNPAID 60.000đ
- PAID 30.000đ
- WAIVED 20.000đ

## Hãy bắt đầu bằng màn sau

Tạo mockup cho màn:

**[ĐIỀN TÊN MÀN Ở ĐÂY]**

Mục tiêu màn này:

**[ĐIỀN MỤC TIÊU NGHIỆP VỤ Ở ĐÂY]**

Các thành phần bắt buộc:

**[ĐIỀN COMPONENT/SECTION BẮT BUỘC Ở ĐÂY]**
