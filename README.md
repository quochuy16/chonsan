# ChọnSân

Nền tảng đặt sân bóng, ghép kèo và quản lý quỹ đội bóng phủi. Yêu cầu đầy đủ: [requirement.md](requirement.md).

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
| `chusan2@chonsan.local` | Chủ các sân còn lại; đội trưởng Sài Gòn United |
| `nguoichoi@chonsan.local` | Người chơi; đội trưởng FC Văn Phòng Cầu Giấy |
| `doitruong2@chonsan.local` | Đội trưởng FC Bia Hơi Đống Đa |

## Khu quản trị

Giao diện riêng tại **http://localhost:3000/quan-tri** (đăng nhập riêng ở `/quan-tri/dang-nhap`, chỉ tài khoản có vai trò quản trị vào được — vd `admin@chonsan.local`). Gồm: Tổng quan · Người dùng (khóa/mở, cấp quyền quản trị) · Sân (duyệt, xác minh, gói Pro) · Đơn đặt sân (lọc, hủy) · Đội bóng · Kèo (ẩn bài vi phạm) · Báo cáo vi phạm.

Cấp quyền quản trị cho một tài khoản: vào Quản trị → Người dùng → Chi tiết → "Cấp quyền quản trị".

## Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm test` | Chạy test logic nghiệp vụ (Vitest) |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run lint` | ESLint |
| `npm run db:reset` | Xóa sạch database và nạp lại dữ liệu mẫu |
| `npm run jobs` | Chạy việc định kỳ một lần (tự hủy đơn chờ quá hạn, nhắc giờ đá). Khi `npm run dev`/`start` đang chạy, việc này tự chạy mỗi 5 phút |
| `npx prisma studio` | Xem/sửa database bằng giao diện web |

## Ghi chú
- Ổ đĩa không phải NTFS (vd exFAT): các lệnh `dev/build/start` đã tự nạp `scripts/fix-exfat-readlink.cjs` để tránh lỗi `EISDIR … readlink`. Trên ổ NTFS bản vá không làm gì.
- Bản đồ dùng OpenStreetMap nên cần có mạng để hiện ô bản đồ.

## Bật đăng nhập Google

Nút "Tiếp tục với Google" chỉ hiện khi `.env` có `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`.

1. Vào [Google Cloud Console](https://console.cloud.google.com/) → tạo (hoặc chọn) một project.
2. **APIs & Services → OAuth consent screen**: chọn *External*, điền tên ứng dụng "ChọnSân" và email hỗ trợ. Khi còn ở chế độ *Testing*, thêm email Google của những người được thử vào mục **Test users**.
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
