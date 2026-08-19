# CẨM NANG KỸ SƯ TRƯỞNG: THIẾT KẾ, TỐI ƯU HÓA VÀ QUẢN TRỊ CƠ SỞ DỮ LIỆU ĐA NỀN TẢNG (ENTERPRISE DATABASE ARCHITECTURE HANDBOOK)
> **Tài liệu chuẩn mực kỹ thuật dành cho Kỹ sư Công nghệ, Quản trị viên Hệ thống (DevOps/DBA) và Trưởng dự án.**  
> *Áp dụng cho các dự án Web Application, Hệ thống Quản lý Điều hành, Đánh giá KPI và Phần mềm Doanh nghiệp/Phòng ban.*

---

## MỤC LỤC TỔNG QUAN

1. [CHƯƠNG 1: NGUYÊN LÝ TÍNH TOÁN & ĐỊNH CỠ DỮ LIỆU (DATABASE SIZING & CAPACITY PLANNING)](#chương-1-nguyên-lý-tính-toán--định-cỡ-dữ-liệu-database-sizing--capacity-planning)
2. [CHƯƠNG 2: MA TRẬN ĐÁNH GIÁ 4 MÔ HÌNH LƯU TRỮ CSDL HIỆN ĐẠI](#chương-2-ma-trận-đánh-giá-4-mô-hình-lưu-trữ-csdl-hiện-đại)
3. [CHƯƠNG 3: TRIỂN KHAI CLOUD DATABASE MIỄN PHÍ (SUPABASE & NEON.TECH)](#chương-3-triển-khai-cloud-database-miễn-phí-supabase--neontech)
4. [CHƯƠNG 4: TRIỂN KHAI PRIVATE CLOUD TRÊN NAS SYNOLOGY / XPENOLOGY (DOCKER)](#chương-4-triển-khai-private-cloud-trên-nas-synology--xpenology-docker)
5. [CHƯƠNG 5: TRIỂN KHAI ON-PREMISE TRÊN MÁY TÍNH WINDOWS NỘI BỘ (24/24)](#chương-5-triển-khai-on-premise-trên-máy-tính-windows-nội-bộ-2424)
6. [CHƯƠNG 6: GIẢI PHÁP KẾT NỐI TỪ XA RA NGOÀI INTERNET (REMOTE ACCESS & TUNNELING)](#chương-6-giải-pháp-kết-nối-từ-xa-ra-ngoài-internet-remote-access--tunneling)
7. [CHƯƠNG 7: CHIẾN LƯỢC BẢO MẬT, SAO LƯU 3-2-1 & KHẮC PHỤC SỰ CỐ (DISASTER RECOVERY)](#chương-7-chiến-lược-bảo-mật-sao-lưu-3-2-1--khắc-phục-sự-cố-disaster-recovery)
8. [CHƯƠNG 8: QUY TRÌNH BÀN GIAO ĐỘC LẬP TÀI KHOẢN CHO KHÁCH HÀNG / ĐƠN VỊ SỬ DỤNG](#chương-8-quy-trình-bàn-giao-độc-lập-tài-khoản-cho-khách-hàng--đơn-vị-sử-dụng)

---

## CHƯƠNG 1: NGUYÊN LÝ TÍNH TOÁN & ĐỊNH CỠ DỮ LIỆU (DATABASE SIZING & CAPACITY PLANNING)

Một kỹ sư cơ sở dữ liệu chuyên nghiệp **không bao giờ ước lượng cảm tính**. Mọi quyết định lựa chọn hạ tầng lưu trữ (500MB Cloud, 2TB HDD, hay 100GB SSD) đều phải xuất phát từ công thức toán học và cấu trúc bảng thực tế.

### 1.1. Nguyên tắc tách biệt nhị phân (Binary Separation Principle)
* **Quy tắc vàng:** *Dữ liệu có cấu trúc (Structured Text/Numbers)* lưu trong **RDBMS (PostgreSQL)**; *Dữ liệu phi cấu trúc dung lượng lớn (Files, PDF, Hình ảnh)* lưu trên **Object Storage / Drive**.
* Cơ sở dữ liệu chỉ lưu chuỗi đường dẫn (URL string ~50–100 bytes), giúp bảng ghi nhẹ hơn gấp hàng nghìn lần so với việc lưu trực tiếp file nhị phân (BLOB).

### 1.2. Công thức tính kích thước bản ghi trung bình (Row Sizing)
Một dòng ghi nhận công việc (`works`) gồm 35 trường dữ liệu:
* Kiểu `INTEGER`, `SERIAL`: 4 bytes/trường
* Kiểu `NUMERIC(5,2)`: 5–8 bytes/trường
* Kiểu `TIMESTAMP`: 8 bytes/trường
* Kiểu `TEXT` (Tiếng Việt UTF-8): trung bình ~300–500 bytes (tên việc, mô tả chi tiết, link minh chứng)
* PostgreSQL Tuple Header + Alignment Padding: ~32 bytes
* B-Tree Index Overhead (2–3 chỉ mục tìm kiếm): ~25% kích thước dòng

$$\text{Kích thước trung bình 1 bản ghi công việc } (\text{Work Row}) \approx 0.8\text{ KB} - 1.2\text{ KB}$$

### 1.3. Bảng định mức phát sinh dữ liệu cho phòng ban (20 Nhân sự)

| Loại dữ liệu nghiệp vụ | Tần suất phát sinh / Nhân sự | Kích thước / Bản ghi | Dung lượng 1 người / Tháng | Dung lượng cả phòng (20 người) / Tháng |
| :--- | :--- | :--- | :--- | :--- |
| **Khai báo công việc (`works`)** | 4 – 5 việc/ngày (~90 việc/tháng) | ~1.0 KB | 90 KB | 1.80 MB |
| **Phân công giao việc (`assignments`)** | 5 – 10 việc/tháng | ~1.0 KB | 10 KB | 0.20 MB |
| **Làm thêm ngoài giờ (`overtimes`)** | 2 – 4 lần/tháng | ~0.8 KB | 3 KB | 0.06 MB |
| **Kết quả KPI tháng (`kpi_results`)** | 1 bản ghi/tháng | ~2.0 KB | 2 KB | 0.04 MB |
| **Thông báo & Nhật ký (`notifications`, `logs`)** | ~20 thông báo/tháng | ~0.5 KB | 10 KB | 0.20 MB |
| **Chỉ mục B-Tree Index & Table Overhead** | Toàn bộ các bảng | ~25% tổng dữ liệu | 30 KB | 0.60 MB |
| **TỔNG CỘNG PHÁT SINH:** | — | — | **~145 KB / người / tháng** | **~2.90 MB / phòng / tháng** |

### 1.4. Dự phóng tăng trưởng theo thời gian (Capacity Projection)

$$\text{Dung lượng } 1\text{ năm} = 2.9\text{ MB/tháng} \times 12\text{ tháng} = \mathbf{34.8\text{ MB/năm}}$$
$$\text{Dung lượng } 5\text{ năm} = 34.8\text{ MB/năm} \times 5 = \mathbf{174\text{ MB}}$$
$$\text{Dung lượng } 10\text{ năm} = 34.8\text{ MB/năm} \times 10 = \mathbf{348\text{ MB}}$$

> **Kết luận Kỹ thuật:** Với gói **500MB miễn phí trọn đời** của các nhà cung cấp Cloud Database (Supabase), một phòng ban 20 người có thể vận hành ổn định trong suốt **10 đến 14 năm** mà chưa chạm ngưỡng giới hạn dung lượng.

---

## CHƯƠNG 2: MA TRẬN ĐÁNH GIÁ 4 MÔ HÌNH LƯU TRỮ CSDL HIỆN ĐẠI

| Tiêu chí so sánh | 1. Cloud Serverless (Supabase / Neon) | 2. NAS Synology / XPEnology (Private Cloud) | 3. PC Windows Nội bộ (On-Premise) | 4. PGlite Cục bộ Nhúng (Embedded File) |
| :--- | :--- | :--- | :--- | :--- |
| **Chi phí phần cứng & điện** | 0 VNĐ (Dùng tài nguyên đám mây) | Đã có sẵn máy NAS (Điện ~15-25W) | Tận dụng PC có sẵn (Điện ~65-150W) | 0 VNĐ (Chạy trên RAM/Applet) |
| **Chi phí duy trì hàng tháng** | 0 VNĐ (Trong hạn mức miễn phí) | 0 VNĐ | 0 VNĐ | 0 VNĐ |
| **Dung lượng lưu trữ** | 500 MB (Đủ dùng 10 năm) | Không giới hạn (Theo ổ cứng NAS: 2-8TB) | Không giới hạn (Theo ổ cứng PC: 500GB-2TB) | Giới hạn theo môi trường sandbox |
| **Tốc độ phản hồi (Latency)** | 30 – 60 ms (Qua Internet quốc tế) | 1 – 5 ms (LAN) / 10 – 30 ms (Remote) | 1 – 5 ms (LAN) / Phụ thuộc cấu hình mạng | < 1 ms (Trực tiếp trong bộ nhớ) |
| **Khả năng truy cập từ xa** | Sẵn sàng 24/7 toàn cầu | Cực kỳ dễ (Cloudflare Tunnel / DDNS) | Cần cấu hình NAT/Port Forwarding | Chỉ truy cập qua đường dẫn applet |
| **Mức độ làm chủ dữ liệu** | Đám mây công cộng (Bảo mật cao) | 100% Thuộc sở hữu nội bộ phòng ban | 100% Thuộc sở hữu nội bộ phòng ban | Lưu trên môi trường chạy app |
| **Khả năng chống hỏng ổ cứng** | Tự động phân tán đám mây | Có RAID 1 / RAID 5 chống cháy nổ ổ | Rủi ro nếu ổ cứng PC bị hỏng vật lý | Phụ thuộc container backup |
| **Mức độ phức tạp cài đặt** | Cực kỳ dễ (2 phút, giao diện web) | Dễ (10 phút, chạy qua Docker DSM) | Trung bình (15 phút, cài phần mềm) | Không cần cài đặt |

---

## CHƯƠNG 3: TRIỂN KHAI CLOUD DATABASE MIỄN PHÍ (SUPABASE & NEON.TECH)

### 3.1. Triển khai với Supabase (Khuyên dùng nhất cho người mới bắt đầu)
* **Bước 1:** Truy cập [https://supabase.com](https://supabase.com), bấm **Start your project** và đăng nhập bằng tài khoản Gmail của khách hàng/đơn vị.
* **Bước 2:** Bấm **New project**:
  * *Organization:* Chọn mặc định.
  * *Name:* `kpi-khtc`
  * *Database Password:* Đặt mật khẩu mạnh (Ví dụ: `KpiKhtc@2026!`).
  * *Region:* Chọn **Singapore (ap-southeast-1)** để có độ trễ thấp nhất về Việt Nam.
* **Bước 3:** Lấy Connection String:
  * Vào menu góc trái dưới: **Project Settings (bánh răng) $\rightarrow$ Database**.
  * Cuộn xuống mục **Connection string**, chọn tab **URI** (hoặc Session Pooler).
  * Chuỗi kết nối mẫu: `postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`
* **Bước 4:** Thay thế `[YOUR-PASSWORD]` bằng mật khẩu đã đặt ở Bước 2, dán vào tab **Cấu hình Lưu trữ & DB** của ứng dụng và bấm **Lưu & Áp dụng**.

### 3.2. Triển khai với Neon.tech (Serverless Postgres trong 1 phút)
* **Bước 1:** Truy cập [https://neon.tech](https://neon.tech), đăng nhập nhanh bằng tài khoản Google.
* **Bước 2:** Bấm **Create Project** $\rightarrow$ Chọn Region **Singapore (ap-southeast-1)**.
* **Bước 3:** Ngay tại màn hình Dashboard, copy chuỗi `Connection string` (Neon đã tạo sẵn mật khẩu hoàn chỉnh trong chuỗi).
* **Bước 4:** Dán trực tiếp vào phần mềm và sử dụng ngay lập tức.

---

## CHƯƠNG 4: TRIỂN KHAI PRIVATE CLOUD TRÊN NAS SYNOLOGY / XPENOLOGY (DOCKER)

Đây là giải pháp **chuẩn mực kỹ thuật cao cấp nhất** cho cơ quan muốn tự chủ 100% dữ liệu mà vẫn phục vụ truy cập 24/7 từ bên ngoài.

### 4.1. Kiến trúc lưu trữ trên Synology DSM
* Sử dụng **Container Manager** (hoặc Docker package) để cô lập môi trường chạy PostgreSQL.
* Ánh xạ (Volume Mapping) thư mục dữ liệu vào ổ cứng vật lý (`/volume1/docker/kpi-postgres`) để dữ liệu không bao giờ bị mất khi khởi động lại hoặc nâng cấp container.

### 4.2. File cấu hình Docker Compose chuẩn (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  kpi-postgres:
    image: postgres:16-alpine
    container_name: kpi_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: matkhau_kpi_2026
      POSTGRES_DB: postgres
      TZ: Asia/Ho_Chi_Minh
    ports:
      - "5432:5432"
    volumes:
      - /volume1/docker/kpi-postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### 4.3. Các bước thực hiện trên giao diện Synology DSM
1. Mở **Container Manager** $\rightarrow$ Chọn mục **Project** $\rightarrow$ Bấm **Create**.
2. Đặt tên Project: `kpi-storage`, chọn thư mục lưu trữ: `/volume1/docker/kpi-postgres`.
3. Dán toàn bộ nội dung file `docker-compose.yml` ở trên $\rightarrow$ Bấm **Next** $\rightarrow$ **Done**.
4. Chuỗi kết nối nội bộ trong cơ quan:  
   `postgresql://postgres:matkhau_kpi_2026@192.168.1.150:5432/postgres`

---

## CHƯƠNG 5: TRIỂN KHAI ON-PREMISE TRÊN MÁY TÍNH WINDOWS NỘI BỘ (24/24)

### 5.1. Cài đặt PostgreSQL Engine
1. Tải bộ cài đặt chính thức từ [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) (Bản PostgreSQL 15 hoặc 16 x64).
2. Chạy file cài đặt: Tick chọn **PostgreSQL Server** và **pgAdmin 4**.
3. Đặt mật khẩu quản trị cho tài khoản `postgres` (Ghi nhớ mật khẩu này).
4. Giữ nguyên cổng mặc định `5432` và Locale mặc định $\rightarrow$ Bấm Next để hoàn tất.

### 5.2. Mở cổng tường lửa Windows Firewall (1 Lệnh PowerShell duy nhất)
Mở **Windows PowerShell** với quyền Administrator và dán lệnh:
```powershell
New-NetFirewallRule -DisplayName "PostgreSQL 5432" -Direction Inbound -LocalPort 5432 -Protocol TCP -Action Allow
```

### 5.3. Cấu hình cấp quyền truy cập mạng nội bộ LAN
* **File 1:** `C:\Program Files\PostgreSQL\16\data\postgresql.conf`  
  Tìm đến dòng `listen_addresses` và sửa lại thành:
  ```ini
  listen_addresses = '*'
  ```
* **File 2:** `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`  
  Thêm vào dòng cuối cùng của file:
  ```ini
  host    all             all             0.0.0.0/0               scram-sha-256
  ```
* **Khởi động lại dịch vụ:** Mở `Services.msc` $\rightarrow$ Chuột phải vào `postgresql-x64-16` $\rightarrow$ Bấm **Restart**.

---

## CHƯƠNG 6: GIẢI PHÁP KẾT NỐI TỪ XA RA NGOÀI INTERNET (REMOTE ACCESS & TUNNELING)

Khi máy chủ đặt tại cơ quan (PC Windows hoặc NAS XPEnology), để nhân viên ở nhà hoặc đi công tác kết nối được mà không gặp sự cố chặn cổng (NAT/CGNAT), kỹ sư cần áp dụng 1 trong 2 giải pháp sau:

```
[MÁY CHỦ NỘI BỘ (NAS/PC)] <──(Kết nối an toàn)──> [CLOUDFLARE EDGE] <──> [NGƯỜI DÙNG TỪ XA]
   (Không cần mở cổng Modem)                      (Mã hóa SSL/HTTPS)       (Điện thoại / Laptop)
```

### 6.1. Giải pháp 1: Cloudflare Tunnel (Khuyên dùng - Bảo mật cao nhất)
* **Nguyên lý:** Phần mềm `cloudflared` trên NAS tự động tạo một đường hầm mã hóa (Outbound Tunnel) ra máy chủ biên của Cloudflare.
* **Ưu điểm tuyệt đối:**
  * **Không cần mở cổng trên Modem (No Port Forwarding):** Tránh hoàn toàn nguy cơ bị hacker quét cổng mạng.
  * **Không cần mua IP tĩnh:** Hoạt động ổn định ngay cả khi nhà mạng đổi IP liên tục.
  * **Tự động cấp chứng chỉ SSL miễn phí:** Toàn bộ dữ liệu truyền tải đều được mã hóa HTTPS.

### 6.2. Giải pháp 2: Dynamic DNS (DDNS) + Port Forwarding
* **Cài đặt:**
  1. Đăng ký tên miền DDNS miễn phí trên [DuckDNS.org](https://www.duckdns.org) hoặc No-IP (Ví dụ: `phongkhtc.duckdns.org`).
  2. Truy cập vào trang quản trị Modem cơ quan (thường là `192.168.1.1`), vào mục **Port Forwarding / NAT**:  
     * *Service Port:* `5432`  
     * *Internal IP:* `192.168.1.150` (IP của máy NAS / PC)  
     * *Protocol:* `TCP`
  3. Chuỗi kết nối từ xa:  
     `postgresql://postgres:matkhau@phongkhtc.duckdns.org:5432/postgres`

---

## CHƯƠNG 7: CHIẾN LƯỢC BẢO MẬT, SAO LƯU 3-2-1 & KHẮC PHỤC SỰ CỐ (DISASTER RECOVERY)

### 7.1. Quy tắc sao lưu kinh điển 3-2-1
* **3 bản sao dữ liệu:** 1 bản đang chạy chính thức, 2 bản sao lưu dự phòng.
* **2 loại phương tiện lưu trữ khác nhau:** Ví dụ 1 bản trên ổ cứng SSD/HDD và 1 bản trên Đám mây (Cloud / Google Drive).
* **1 bản sao lưu nằm ngoài cơ quan (Off-site):** Đảm bảo an toàn tuyệt đối khi xảy ra sự cố chập điện, cháy nổ hoặc hỏng phần cứng tại phòng.

### 7.2. Lệnh Backup & Restore cơ sở dữ liệu qua dòng lệnh (CLI)
* **Lệnh trích xuất bản sao lưu đầy đủ (Dump Backup):**
  ```bash
  pg_dump -U postgres -h 127.0.0.1 -p 5432 -d postgres -F c -b -v -f "backup_kpi_$(date +%Y%m%d).dump"
  ```
* **Lệnh khôi phục dữ liệu tức thì (Restore):**
  ```bash
  pg_restore -U postgres -h 127.0.0.1 -p 5432 -d postgres -v "backup_kpi_20260818.dump"
  ```

---

## CHƯƠNG 8: QUY TRÌNH BÀN GIAO ĐỘC LẬP TÀI KHOẢN CHO KHÁCH HÀNG / ĐƠN VỊ SỬ DỤNG

Khi bạn phát triển ứng dụng này và muốn chuyển giao cho đơn vị khác sử dụng:

```
[BƯỚC 1: Hướng dẫn Khách hàng tạo Database riêng]
   └── Gửi tài liệu Chương 3 (Supabase) hoặc Chương 4 (NAS) cho khách hàng tự tạo tài khoản.

[BƯỚC 2: Khách hàng cung cấp Connection String]
   └── Khách hàng chỉ cần gửi chuỗi: postgresql://postgres:pwd@host:5432/db

[BƯỚC 3: Cấu hình trực tiếp tại Tab Quản trị]
   └── Đăng nhập tài khoản Admin vào hệ thống.
   └── Truy cập menu "Quản trị hệ thống" -> "Cấu hình Lưu trữ & DB".
   └── Dán chuỗi kết nối của khách hàng -> Bấm "Kiểm tra kết nối" -> Bấm "Lưu cấu hình".

[BƯỚC 4: Bàn giao hoàn tất]
   └── Toàn bộ dữ liệu của khách hàng sẽ được ghi trực tiếp vào tài khoản CSDL của họ.
   └── Bạn (người phát triển) hoàn toàn không phải trả bất kỳ chi phí lưu trữ nào.
```

---
*Tài liệu được biên soạn và chuẩn hóa bởi Kỹ sư trưởng Hệ thống KPI KHTC.*
