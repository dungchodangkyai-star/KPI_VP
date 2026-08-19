# BỘ TÀI LIỆU ĐÓNG GÓI NÂNG CẤP HỆ THỐNG KPI VĂN PHÒNG (KHTC)
## HƯỚNG DẪN TRIỂN KHAI CHUẨN XÁC 100% SANG DỰ ÁN MỚI / DỰ ÁN ĐANG HOẠT ĐỘNG THẬT

Tài liệu này đóng gói toàn bộ các tính năng cốt lõi đã được hoàn thiện, kiểm thử và đồng bộ thành công, bao gồm:
1. **Giao việc 2 luồng độc lập & Tự động hóa Zalo 1-Click** (Giao nhiều người, phân công Chủ trì/Phối hợp, tùy biến mẫu tin nhắn, khai báo Zalo 1 lần).
2. **Quản lý Cơ sở dữ liệu & Chuyển đổi linh hoạt (Database Storage)** (An toàn 100% cho dự án đang chạy thật, không làm mất dữ liệu).
3. **Chuẩn hóa giao diện xuất Excel doanh nghiệp** (Header xanh Navy `#1F4E78`, viền ô, căn lề, tự động độ rộng cột).

---

### PHẦN 1: CÂU LỆNH MẪU (PROMPT) ĐỂ DÁN VÀO DỰ ÁN KHÁC

> **Cách làm:** Bạn chỉ cần copy toàn bộ đoạn văn bản trong khung dưới đây và gửi cho AI ở dự án thứ 2:

```text
Tôi cần bạn nâng cấp và đồng bộ toàn diện các tính năng mới nhất từ dự án mẫu KPI KHTC sang dự án này. 
Dự án này đang có dữ liệu thật nên yêu cầu AN TOÀN TUYỆT ĐỐI, không ghi đè mất dữ liệu hiện có.

Hãy triển khai chính xác 100% theo các module sau:

1. MODULE GIAO VIỆC 2 LUỒNG & TỰ ĐỘNG HÓA ZALO (src/pages/AssignTask.tsx & server/zaloService.ts):
   - Phân chia 2 luồng giao việc rõ ràng:
     + [Luồng 1: Giao việc nội bộ]: Chỉ lưu vào hệ thống và phát thông báo trên web app, không gửi Zalo.
     + [Luồng 2: Giao việc & Tự động gửi Zalo 1-Click]: Lưu hệ thống + Tự động gửi Zalo cho toàn bộ nhân sự được chọn.
   - Cho phép giao 1 nhiệm vụ cho NHIỀU NGƯỜI cùng lúc, có chọn vai trò ⭐ Chủ trì (hệ số 100%) hoặc 👥 Phối hợp (hệ số riêng).
   - Modal "⚙️ Cấu hình Zalo & Mẫu tin": Lãnh đạo chỉ khai báo SĐT và tên 1 lần duy nhất trên web.
   - Trình soạn thảo Mẫu tin nhắn Zalo có các nút chèn biến tự động (+ {NGUOI_NHAN}, + {TEN_VIEC}, + {HAN_CHOT}, + {DIEM_CHUAN}, + {SAN_PHAM}, + {Y_KIEN_CHI_DAO}, + {LINK_APP}), có khung xem trước và nút Gửi thử nghiệm kết nối.
   - Bảng danh sách công việc có nút "⚡ Zalo" để bắn lại thông báo tức thì.

2. BACKEND API CHO GIAO VIỆC & ZALO (server.ts & server/zaloService.ts):
   - Nâng cấp POST /api/assignments nhận mảng `receivers: [{ userId, role, coef }]` để tạo bản ghi cho từng người.
   - Tạo file server/zaloService.ts hỗ trợ 4 phương thức: webhook, group_webhook, oa_zns, direct_app.
   - Thêm các endpoint: GET /api/zalo/config, POST /api/zalo/config, POST /api/zalo/send, POST /api/zalo/test.

3. MODULE QUẢN LÝ CƠ SỞ DỮ LIỆU AN TOÀN (src/pages/AdminDatabase.tsx, server/databaseStorage.ts, server/databaseRoutes.ts):
   - Tạo giao diện cấu hình database cho phép chuyển đổi giữa Database Mặc định và Database PostgreSQL ngoài.
   - Lưu cấu hình vào file data/db-config.json (không sửa cứng file mã nguồn).
   - Có tính năng Test kết nối, Đồng bộ cấu trúc bảng và Sao lưu/Khôi phục an toàn.

4. CHUẨN HÓA XUẤT BÁO CÁO EXCEL (src/excelUtils.ts):
   - Tạo hàm exportStyledExcel chuẩn hóa: Header màu xanh Navy (#1F4E78), chữ trắng đậm, viền mỏng đen, căn chỉnh lề chuẩn cho từng loại dữ liệu, tự động căn độ rộng cột.
   - Áp dụng vào tất cả các bảng xuất Excel trong hệ thống.
```

---

### PHẦN 2: DANH SÁCH CÁC TẬP TIN CẦN ĐƯỢC ĐỒNG BỘ

Khi kiểm tra trên dự án mới, đảm bảo các file sau đã được tạo hoặc cập nhật đúng:

1. **`server/zaloService.ts`**: Xử lý logic cấu hình Zalo, lưu file `data/zalo-config.json`, định dạng mẫu tin nhắn và gọi API Webhook/ZNS.
2. **`server.ts`**:
   - Khai báo import `getZaloConfig`, `saveZaloConfig`, `sendZaloNotification`, `formatZaloMessage`.
   - Các route: `/api/zalo/config`, `/api/zalo/send`, `/api/zalo/test`.
   - Nâng cấp route `POST /api/assignments` để nhận mảng `receivers`.
   - Gắn `databaseRouter` tại `/api/database`.
3. **`src/pages/AssignTask.tsx`**:
   - Giao diện chọn nhiều nhân viên bằng thẻ tag/checkbox.
   - Bảng phân công vai trò Chủ trì / Phối hợp và chỉnh hệ số K riêng.
   - 2 nút bấm: `🔘 Luồng 1: Giao việc nội bộ` và `⚡ Luồng 2: Giao việc & Tự động gửi Zalo`.
   - Cửa sổ Modal Cấu hình Zalo & Trình chỉnh sửa mẫu tin nhắn.
   - Nút bắn Zalo nhanh trong bảng danh sách đã giao.
4. **`src/excelUtils.ts`**: Thư viện dùng chung để xuất file Excel chuẩn giao diện Navy Blue.
5. **`server/databaseStorage.ts` & `server/databaseRoutes.ts`**: Quản lý kết nối Database động.
6. **`src/pages/AdminDatabase.tsx`**: Giao diện Quản trị Cơ sở dữ liệu.

---

### PHẦN 3: NGUYÊN TẮC BẢO TOÀN DỮ LIỆU CHO DỰ ÁN THẬT

1. **Không chạy lại lệnh Drop Table / Reset Database:** 
   * Giữ nguyên dữ liệu trong các bảng `users`, `works`, `assignments`, `evaluations`.
2. **Không ghi đè mật khẩu hoặc tài khoản thực tế của cán bộ:**
   * Hệ thống sẽ tự động cập nhật thêm các trường mới nếu thiếu mà không làm ảnh hưởng tài khoản đang đăng nhập.
3. **File cấu hình lưu riêng:**
   * Cấu hình Zalo lưu tại `data/zalo-config.json`.
   * Cấu hình Database lưu tại `data/db-config.json`.
