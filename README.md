# ChonSan

Nền tảng đặt & cho thuê sân bóng phủi, kèm ghép kèo tìm đối / tìm người. Yêu cầu đầy đủ: [requirement.md](requirement.md).

## Ba trang riêng

Cùng một mã nguồn và một database, nhưng là ba giao diện tách biệt, mỗi bên có header/menu và trang đăng nhập riêng:

| Trang | Dành cho | Local | Khi deploy | Đăng nhập |
|---|---|---|---|---|
| **Tìm sân** | Người chơi: tìm sân, đặt sân, tìm kèo | `/` | `SITE_URL` (vd chonsan.vn) | `/dang-nhap` — xem sân/kèo tự do; đặt sân, đăng/nhận kèo phải đăng nhập |
| **Chủ sân** | Chủ sân & nhân viên: đăng sân cho thuê, quản lý lịch | `/chu-san` | `OWNER_URL` (vd chusan.chonsan.vn) | `/chu-san/dang-nhap` — bắt buộc (trừ trang giới thiệu) |
| **Admin** | Quản trị viên | `/quan-tri` | cùng host Tìm sân | `/quan-tri/dang-nhap` — bắt buộc, chỉ ADMIN |

Khi deploy hai tên miền: đặt `OWNER_URL` và `SESSION_COOKIE_DOMAIN=".chonsan.vn"` (dùng chung một lần đăng nhập). `src/middleware.ts` tự chuyển `/chu-san…` sang tên miền Chủ sân và ngược lại.

## Có gì trong bản hiện tại

| Đường dẫn | Phần |
|---|---|
| `/san`, `/san/[slug]` | Tìm sân (khu vực, gần tôi, ngày + giờ còn trống, bản đồ; sắp xếp khoảng cách/giá/đánh giá), trang sân, đặt sân (lặp hằng tuần được) |
| `/dat-san/[code]` | Chi tiết đơn: VietQR trả cọc, hủy, đánh giá sau khi đá |
| `/chu-san` | Chủ sân: cụm sân (vị trí lấy từ link Google Maps), sân con, sân ghép, lịch theo ngày, đơn tay, khóa giờ, đặt cố định, bảng giá + ngày lễ + giờ giảm giá, nhân viên, thống kê, xuất CSV |
| `/keo` | Hai tab: Tìm đối và Tìm người đá ghép (`/keo/nguoi/[id]`). Kèo gắn với người đăng, tên đội tự gõ; uy tín tính theo người; bài có từ ngữ cá cược bị chặn |
| `/tai-khoan` | Hồ sơ, liên kết Google, thông báo |
| `/quan-tri` | Khu quản trị riêng (xem dưới) |

Khu vực tìm sân hiện có Hà Nội, TP.HCM, Đà Nẵng (`src/lib/domain/locations.ts`).

## Chạy trên máy (local)

Cần Node.js 20 trở lên.

```bash
npm install
copy .env.example .env      # macOS/Linux: cp .env.example .env
npm run db:reset            # tạo database SQLite + nạp dữ liệu mẫu
npm run dev                 # mở http://localhost:3000
```

Chạy bản production (nhanh hơn khi thử):

```bash
npm run build
npm start
```

## Tài khoản mẫu

Mật khẩu chung nằm ở hằng số `DEMO_PASSWORD` trong [prisma/seed.ts](prisma/seed.ts).

| Email | Vai trò |
|---|---|
| `admin@chonsan.local` | Quản trị viên (duyệt sân, xử lý báo cáo, bật gói Pro) |
| `chusan@chonsan.local` | Chủ "Sân bóng Xanh Đống Đa" (gói Pro, có sân ghép) và "Sân Hồ Tây Arena" |
| `nhanvien@chonsan.local` | Nhân viên của Sân bóng Xanh Đống Đa |
| `chusan2@chonsan.local` | Chủ các sân còn lại; đăng kèo "Sài Gòn United" |
| `nguoichoi@chonsan.local` | Người chơi; đăng kèo "FC Văn Phòng Cầu Giấy" và bài tìm người |
| `doitruong2@chonsan.local` | Người chơi; đăng kèo "FC Bia Hơi Đống Đa" (có một kèo đã đá xong, đã đánh giá) |

## Khu quản trị

Giao diện riêng tại **http://localhost:3000/quan-tri** (đăng nhập riêng ở `/quan-tri/dang-nhap`, chỉ tài khoản có vai trò quản trị vào được — vd `admin@chonsan.local`). Gồm: Tổng quan · Người dùng (khóa/mở, cấp quyền quản trị) · Sân (duyệt, xác minh, gói Pro) · Đơn đặt sân (lọc, hủy) · Kèo (ẩn bài vi phạm) · Báo cáo vi phạm.

Cấp quyền quản trị cho một tài khoản: vào Quản trị → Người dùng → Chi tiết → "Cấp quyền quản trị".

## Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm test` | Chạy test (Vitest): logic nghiệp vụ `src/lib/domain` + vài module server (flash, Google, Maps) |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run lint` | ESLint |
| `npm run db:reset` | Xóa sạch database và nạp lại dữ liệu mẫu |
| `npm run jobs` | Chạy việc định kỳ một lần (tự hủy đơn chờ quá hạn, nhắc giờ đá). Khi `npm run dev`/`start` đang chạy, việc này tự chạy mỗi 5 phút |
| `npx prisma studio` | Xem/sửa database bằng giao diện web |

## Ghi chú
- Ổ đĩa không phải NTFS (vd exFAT): các lệnh `dev/build/start` đã tự nạp `scripts/fix-exfat-readlink.cjs` để tránh lỗi `EISDIR … readlink`. Trên ổ NTFS bản vá không làm gì.
- Bản đồ dùng OpenStreetMap nên cần có mạng để hiện ô bản đồ.
- Vị trí cụm sân: dán link Google Maps (link có ghim, link rút gọn `maps.app.goo.gl`) hoặc tọa độ `21.02, 105.85`. Link rút gọn cần máy chủ ra được mạng (qua `HTTPS_PROXY` nếu có).
- Việc định kỳ chạy trong tiến trình `npm run dev`/`start`; tắt bằng `DISABLE_LOCAL_JOBS=1`. Khi deploy: đặt `CRON_SECRET` và cho cron gọi `GET /api/jobs` với header `Authorization: Bearer <CRON_SECRET>`.

## Biến môi trường

Xem [.env.example](.env.example): `DATABASE_URL`, `SESSION_SECRET` (≥ 32 ký tự), `SITE_URL`, `OWNER_URL` + `SESSION_COOKIE_DOMAIN` (tách web Chủ sân), `CRON_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `HTTPS_PROXY`/`NO_PROXY` (tùy chọn).

## Bật đăng nhập Google

Nút "Tiếp tục với Google" chỉ hiện khi `.env` có `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`.

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo (hoặc chọn) một project.
2. **APIs & Services → OAuth consent screen**: chọn *External*, điền tên ứng dụng "ChonSan" và email hỗ trợ. Khi còn ở chế độ *Testing*, thêm email Google của những người được thử vào mục **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
4. Chép **Client ID** và **Client secret** vào `.env`:
   ```
   GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="..."
   SITE_URL="http://localhost:3000"
   ```
5. Khởi động lại `npm run dev` / `npm start`.

Khi đưa lên mạng: thêm `https://chonsan.vn` và `https://chonsan.vn/auth/google/callback` vào hai mục trên, đặt `SITE_URL="https://chonsan.vn"`.

Cách hoạt động: đăng nhập Google lần đầu sẽ tạo tài khoản mới và yêu cầu nhập SĐT + đồng ý chính sách; nếu email Google trùng tài khoản đã có thì tự liên kết vào tài khoản đó. Người đang đăng nhập có thể liên kết/bỏ liên kết Google trong trang Tài khoản.

Mạng công ty có proxy: server gọi Google qua `HTTPS_PROXY`/`NO_PROXY` trong biến môi trường (không cần cấu hình thêm).
