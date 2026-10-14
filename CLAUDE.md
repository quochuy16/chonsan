# ChọnSân — hướng dẫn cho Claude

Nền tảng đặt sân & quản lý đội bóng phủi ở Việt Nam (bóng đá trước, sau thêm pickleball, cầu lông…).
Yêu cầu đầy đủ: [requirement.md](requirement.md). Đọc nó trước khi thêm tính năng.

## Chạy dự án
```bash
npm install
npm run db:reset     # tạo SQLite (prisma/dev.db) + nạp dữ liệu mẫu
npm run dev          # http://localhost:3000
npm test             # Vitest cho src/lib/domain
npm run typecheck
```
Tài khoản mẫu: xem [README.md](README.md) và `prisma/seed.ts` (hằng số `DEMO_PASSWORD`).

## Kiến trúc
- Next.js 15 App Router, React 19, Tailwind CSS 4. Server Components mặc định; thao tác ghi dùng **Server Actions** trong `src/app/**/actions.ts`.
- **Hai giao diện tách biệt**: `src/app/(site)/` = trang người dùng (layout có Header/footer); `src/app/(admin)/quan-tri/` = khu quản trị riêng (đăng nhập riêng `/quan-tri/dang-nhap`, sidebar riêng, chỉ ADMIN). Layout gốc `src/app/layout.tsx` chỉ có khung HTML. **Không** đặt chức năng quản trị trong giao diện người dùng. Mọi trang và action quản trị gọi `requireAdmin()`; thao tác dùng `ActionButton` + `back` (chỉ nhận đường dẫn `/quan-tri…`).
- Prisma + SQLite ở local (`prisma/schema.prisma`). Khi deploy đổi `provider` sang `postgresql` — không dùng tính năng chỉ có ở SQLite.
- `src/lib/domain/` — **logic nghiệp vụ thuần**: không import Next.js, Prisma, hay React. Sẽ tách thành package dùng chung cho app mobile (Expo). Mọi phép tính giá, chia quỹ, kiểm tra trùng lịch, VietQR, giờ VN đặt ở đây và có test.
- `src/lib/server/` — chỉ chạy phía máy chủ: `db.ts` (Prisma client), `auth.ts` (phiên JWT trong cookie), `permissions.ts` (kiểm quyền), `google.ts` + `google-account.ts` (đăng nhập Google; route ở `src/app/auth/google`).
- `requireUser()` chuyển người chưa có SĐT (đăng ký qua Google) sang `/tai-khoan/hoan-tat`; trang/action nào phải dùng được khi chưa có SĐT thì dùng `getCurrentUser()`.
- `src/components/` — UI dùng chung.
- **Việc định kỳ** (`src/lib/server/jobs.ts`): tự hủy đơn chờ quá hạn, đánh dấu đơn đã đá xong, nhắc giờ đá. Local: `src/instrumentation.ts` tự chạy mỗi 5 phút (tắt bằng `DISABLE_LOCAL_JOBS=1`); chạy tay: `npm run jobs`; khi deploy: cron gọi `GET /api/jobs` với `Authorization: Bearer $CRON_SECRET`. Mọi việc phải idempotent (dùng `updateMany` có điều kiện trạng thái).

## Quy ước bắt buộc
- **Giao diện tiếng Việt có dấu**; code, tên biến, tên file tiếng Anh. URL tiếng Việt không dấu (`/san`, `/doi`, `/keo`, `/chu-san`).
- **Tiền** là số nguyên VND (`Int`). Hiển thị bằng `formatVND()`.
- **Thời gian**: lưu `DateTime` (UTC) trong DB; chuyển đổi/hiển thị theo giờ Việt Nam qua `src/lib/domain/time.ts`. Không dùng `new Date().getHours()` trực tiếp cho nghiệp vụ.
- **Không trùng lịch**: mọi chỗ tạo/sửa đơn đặt sân phải đi qua `createBookingTx` trong `src/lib/server/booking.ts` (kiểm tra trùng trong transaction, tính cả sân ghép).
- **Kiểm quyền ở máy chủ** trong mọi Server Action — không tin dữ liệu ẩn trong form.
- **Nền tảng không giữ tiền**: thanh toán là chuyển khoản VietQR thẳng tới chủ sân/thủ quỹ, xác nhận thủ công.
- **Không có tính năng cá cược / "kèo có độ"** dưới bất kỳ hình thức nào.
- Enum lưu dạng `String` trong Prisma (SQLite không hỗ trợ enum); giá trị hợp lệ khai báo trong `src/lib/domain/constants.ts`.

## Skill
- `.claude/skills/chonsan-domain` — thuật ngữ bóng phủi và quy tắc nghiệp vụ (giá sân, sân ghép, quỹ đội, uy tín). Dùng khi viết/sửa logic nghiệp vụ.

## Bẫy đã gặp
- **Tailwind CSS 4**: class tự định nghĩa (`btn`, `card`, `input`…) khai báo bằng `@utility` trong `globals.css`, không dùng `@layer components` (v4 không cho `@apply` class trong layer).
- **Lưới CSS trên mobile**: luôn ghi `grid grid-cols-1 … lg:grid-cols-N`; thiếu `grid-cols-1` thì ô lưới không co lại và trang tràn ngang ở 375px.
- **`fail()` / `done()`** (`src/lib/server/flash.ts`) gắn `?error=` / `?ok=` trước `#hash` — dùng chúng cho mọi Server Action thay vì tự ghép URL.
- **Regex tiếng Việt**: `\b` của JS không coi chữ có dấu là chữ cái; dùng `(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])` với cờ `u` (xem `moderation.ts`).
- **Ổ exFAT**: dự án nằm trên ổ không phải NTFS → `readlink` trả `EISDIR`. Script npm đã nạp `scripts/fix-exfat-readlink.cjs`; nếu gọi `next` trực tiếp thì thêm `node -r ./scripts/fix-exfat-readlink.cjs`.
- **Prisma chặn `db push --force-reset` khi do AI chạy** — đó là quyết định của người dùng; nhờ họ tự chạy `npm run db:reset`, đừng lách.
- **Ghi file**: công cụ Write/Edit có thể bị auto mode chặn. Heredoc trong Bash bị cắt nếu lệnh dài hơn ~6KB và biến hai dấu gạch chéo ngược liền nhau thành một → ghi file từng phần, sửa file bằng script Node (đặt trong scratchpad) có kiểm tra chuỗi tồn tại.
- **Proxy công ty** (`HTTPS_PROXY`): `fetch` có sẵn của Node bỏ qua proxy → gọi API bên ngoài phía server phải dùng `fetch` của `undici` với `EnvHttpProxyAgent` (xem `google.ts`).
- Không dùng `next/font/google`: môi trường dev có thể không tải được Google Fonts; font khai báo trong `@theme`.
