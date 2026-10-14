# ChonSan — Tài liệu yêu cầu

> Tên miền dự kiến: **chonsan.vn** · Phiên bản 0.3 (2026-10-14)
> Tên thương hiệu: **ChonSan** (không dấu — quyết định của chủ dự án 2026-10-14, trước đây là "ChonSan"). Lưu ý: chonsan.com là web Forex, không liên quan.

Mục có nhãn **[Quyết định của Claude]** là lựa chọn mình đưa ra khi chủ dự án chưa nói tới. Chủ dự án đổi được.

---

## 1. Ý tưởng và lý do

Ở Việt Nam, việc **tìm sân, cho thuê sân, tìm đối, tìm người đá ghép, quản lý quỹ đội** của bóng đá phủi (và pickleball, cầu lông…) đang diễn ra trên **group/fanpage Facebook, Zalo, sổ tay, Excel**:

- Giá sân không công khai, phải nhắn hỏi từng nơi; không biết giờ nào trống.
- Chủ sân ghi lịch bằng sổ/Zalo → trùng giờ, quên khách.
- Đội bóng thu chi qua tin nhắn, không rõ ai còn nợ.
- Bài tìm đối/tìm người trôi trong group; đội bùng kèo không bị đánh giá.

**ChonSan** tập trung vào **đặt và cho thuê sân**: **chủ sân** quản lý & cho thuê, **người chơi** tìm & đặt sân; thêm **kèo** (tìm đối, tìm người) như một lựa chọn phụ để kéo người chơi quay lại.

**Thành công là khi:** chủ sân bỏ sổ tay dùng lịch ChonSan; người tìm "sân bóng gần [khu vực]" trên Google thấy ChonSan và đặt được ngay với giá đúng.

> **Quyết định 2026-10-14 (chủ dự án):** bỏ phần **quản lý đội bóng & quỹ đội** (thành viên, điểm danh, thu chi, link mời). Giữ **kèo** nhưng gắn với **người đăng**; tên đội chỉ là chữ tự gõ, điểm uy tín tính theo người.

---

## 2. Mục tiêu · Không làm · Tuyệt đối tránh

**Mục tiêu**
- Website gồm: Chủ sân · Người thuê · Kèo (phụ).
- Bắt đầu với **bóng đá** (sân 5, 7, 11); thêm pickleball, cầu lông, tennis không phải viết lại.
- Trang sân công khai, SEO tốt. Mobile-first.
- Sau này làm **app mobile**, dùng lại được nhiều code.

**Không làm lúc này**
- App mobile native (làm sau).
- Nền tảng **tự giữ tiền** người dùng (ví, thu hộ) — cần giấy phép trung gian thanh toán.
- Livestream, bảng tin kiểu mạng xã hội.
- Quản lý đội bóng, quỹ đội, điểm danh (đã bỏ 2026-10-14).

**Tuyệt đối tránh**
- **Không có tính năng cá cược / "kèo có độ".** Không ghi mức cược, không giữ tiền cược, không thống kê thắng thua tiền. Bài kèo nhắc tới cược → báo cáo & ẩn. Chia tiền sân giữa hai đội thì được.
- **Không bao giờ trùng lịch** (hai đơn cùng sân, cùng giờ — tính cả sân ghép).
- Không bắt đăng nhập mới được xem sân.

---

## 3. Ba trang & vai trò

**Quyết định 2026-10-14 (chủ dự án):** ChonSan gồm **3 trang riêng** (cùng code + database, giao diện và đăng nhập riêng):
1. **Admin** (`/quan-tri`) — chỉ quản trị viên.
2. **Tìm sân** (`chonsan.vn`) — người muốn tìm sân, đặt sân, tìm kèo. Xem sân/kèo không cần đăng nhập (giữ SEO); đặt sân, đăng/nhận kèo, đánh giá phải đăng nhập.
3. **Chủ sân** (`chusan.chonsan.vn`, local `/chu-san`) — đăng sân cho thuê, lịch, bảng giá, đơn, thống kê, nhân viên. Phải đăng nhập (trừ trang giới thiệu cho chủ sân mới).

Một tài khoản dùng được cả hai trang Tìm sân và Chủ sân (chung cookie phiên qua `SESSION_COOKIE_DOMAIN`).


Một tài khoản có thể mang nhiều vai trò.

| Vai trò | Làm gì |
|---|---|
| Khách | Xem/tìm sân, giá, giờ trống, bài kèo |
| Người chơi | Đặt sân, đăng/nhận kèo, đánh giá |
| Chủ sân | Cụm sân, sân con, bảng giá, lịch, đơn, thống kê |
| Nhân viên sân | Xem lịch, tạo & xác nhận đơn; không xem doanh thu |

| Admin | Duyệt sân, xử lý báo cáo, quản lý gói thu phí |

---

## 4. Tính năng

### 4.1 Tài khoản
- Đăng ký / đăng nhập; **số điện thoại** bắt buộc trong hồ sơ.
- Hồ sơ: tên, SĐT, khu vực, trình độ, vị trí hay đá.
- Đăng nhập bằng **email + mật khẩu** hoặc **Google** (OAuth 2.0 + PKCE). Tài khoản tạo qua Google phải nhập SĐT và đồng ý chính sách trước khi dùng; email Google trùng tài khoản cũ thì tự liên kết. Liên kết / bỏ liên kết Google trong trang Tài khoản.
- [Quyết định của Claude] Làm sau: OTP SMS, Zalo.

### 4.2 Chủ sân
- **Cụm sân:** tên, địa chỉ, tỉnh/khu vực, tọa độ, ảnh, mô tả, giờ mở cửa, tiện ích, ngân hàng (tạo VietQR). Admin **duyệt** rồi mới hiện công khai.
- **Tọa độ** lấy từ link Google Maps chủ sân dán vào (link có ghim, link rút gọn, hoặc tọa độ). Chỉ tin vị trí ghim / tham số tọa độ; link rút gọn chỉ đi theo chuyển hướng tới host của Google.
- **Khu vực:** từ 07/2025 Việt Nam bỏ cấp quận/huyện, nhưng người chơi vẫn gọi sân theo tên quận cũ ("sân Cầu Giấy") → ChonSan dùng tên quận cũ làm "khu vực". Hiện có Hà Nội, TP.HCM, Đà Nẵng.
- **Sân con:** tên, môn, loại (5/7/11), mặt sân, mái che.
- **Sân ghép:** sân 7 ghép từ hai sân 5 — đặt sân lớn thì khóa sân nhỏ và ngược lại.
- **Bảng giá:** quy tắc theo sân con (hoặc cả cụm), ngày trong tuần, khung giờ; ngày lễ tính theo % riêng. Đơn vắt qua hai khung giá tính đúng từng phần.
- **Lịch sân:** xem theo ngày, mỗi sân con một cột, màu theo trạng thái; thêm đơn tay cho khách gọi điện (tên + SĐT); khóa giờ bảo trì.
- **Đặt cố định** hằng tuần.
- **Đơn:** `PENDING → CONFIRMED → COMPLETED`, hoặc `CANCELLED`, `NO_SHOW` (bùng). Tự động xác nhận bật/tắt. Đơn chờ quá `pendingExpireMin` phút (mặc định 120, chủ sân chỉnh được) hoặc đã tới giờ đá mà chưa xác nhận thì **tự hủy** để nhả giờ. Cọc cố định hoặc %, trả qua **VietQR**; chủ sân bấm "đã nhận cọc". Chính sách hủy (số giờ tối thiểu).
- **Giờ trống giảm giá** để lấp sân.
- **Thống kê:** doanh thu theo ngày/tháng/sân con, tỉ lệ lấp sân, khách quen, tỉ lệ bùng.
- **Nhân viên** có phân quyền.

### 4.3 Người thuê sân
- **Tìm sân:** theo vị trí hiện tại, tỉnh/quận, tên; danh sách + bản đồ; sắp xếp theo khoảng cách/giá/đánh giá; lọc môn, loại sân, ngày + giờ còn trống, tiện ích.
- **Trang sân (SEO):** ảnh, địa chỉ, chỉ đường, tiện ích, bảng giá, lịch trống 7 ngày, đánh giá.
- **Đặt sân:** chọn sân con, ngày, giờ, thời lượng → tổng tiền & cọc → đặt; "Lịch đặt của tôi", hủy, đánh giá sau khi đá.
- **Thông báo** trong web (xác nhận / hủy / nhắc giờ). **Nhắc giờ đá** 2 tiếng trước cho người đặt, mỗi đơn chỉ nhắc một lần. Email, Zalo ZNS, push làm sau.

### 4.4 ~~Đội bóng & quỹ~~ — đã bỏ (2026-10-14)
Không làm quản lý đội, thành viên, điểm danh, quỹ đội. Lý do: tập trung vào đặt & cho thuê sân để cạnh tranh trực tiếp với các nền tảng đặt sân (xem §11).

### 4.5 Kèo & cộng đồng (tính năng phụ)
- Kèo gắn với **người đăng** (tài khoản). **Tên đội** là chữ người dùng tự gõ, không có đội trên hệ thống.
- **Tìm đối:** tên đội, ngày giờ, sân, loại sân, khu vực, trình độ, cách chia tiền sân. Người khác "Nhận kèo" (kèm tên đội của họ) → người đăng chọn một → hai bên thấy SĐT nhau.
- **Tìm người:** "cần X người, vị trí Y, Z đ/người", tên đội/nhóm không bắt buộc; người chơi "Xin vào", người đăng duyệt.
- **Uy tín (theo người):** sau giờ đá, hai bên đã chốt kèo đánh giá nhau (đúng giờ, fair-play, đúng trình độ); báo bùng kèo; điểm uy tín công khai cạnh tên người đăng / người nhận kèo.
- **Báo cáo vi phạm** (chơi xấu, lừa đảo, cá cược) → admin xử lý.
- **Tự chặn từ ngữ cá cược** ("cá cược", "kèo có độ", "ăn tiền", "nhà cái"…) khi đăng bài kèo, bài tìm người và lời nhắn nhận kèo; không chặn nhầm "trình độ", "độ tuổi".

### 4.6 Admin
- **Giao diện riêng** `/quan-tri` (đăng nhập riêng, không lẫn với giao diện người dùng).
- Tổng quan số liệu; người dùng (tìm, khóa/mở, cấp/bỏ quyền quản trị, xem lịch sử); sân (duyệt, ẩn, xác minh, gói Pro); đơn đặt sân toàn hệ thống (lọc, hủy); kèo (ẩn/hiện bài); báo cáo vi phạm (bỏ qua / ẩn nội dung / khóa người đăng).

---

## 5. Kiếm tiền [Quyết định của Claude]
- Người chơi & đội: **miễn phí**.
- Chủ sân: gói **Miễn phí** (1 cụm, tối đa 2 sân con) và **Pro** theo tháng (không giới hạn, nhân viên, thống kê, giờ giảm giá, ưu tiên hiển thị). Thanh toán gói thủ công lúc đầu.

## 6. Thanh toán
- **Nền tảng không giữ tiền.** Tiền đi thẳng người chơi → chủ sân qua **VietQR** (có số tiền & nội dung). Xác nhận thủ công; sau nối Casso/SePay.

---

## 7. Công nghệ [Quyết định của Claude]

| Phần | Bản local (hiện tại) | Khi đưa lên mạng |
|---|---|---|
| Ngôn ngữ | TypeScript | TypeScript |
| Web | Next.js 15 (App Router) + Tailwind CSS 4 | giữ nguyên |
| Database | **Prisma + SQLite** (máy chưa có Docker) | Prisma + **PostgreSQL** (Supabase/Neon) |
| Đăng nhập | Email + mật khẩu và Google (OAuth 2.0 + PKCE), cookie phiên ký JWT (jose) | thêm OTP SMS, Zalo |
| Việc định kỳ | Chạy trong tiến trình Next.js mỗi 5 phút (`src/instrumentation.ts`) | cron gọi `GET /api/jobs` (Bearer `CRON_SECRET`) |
| Gọi mạng phía server | `undici` + `EnvHttpProxyAgent` (hỗ trợ proxy công ty) | giữ nguyên |
| Bản đồ | Leaflet + OpenStreetMap | giữ nguyên |
| Kiểm thử | Vitest cho logic nghiệp vụ + vài module server (Google, Maps, flash) | thêm Playwright |
| App mobile | — | React Native + Expo, dùng chung `src/lib/domain` |

Logic nghiệp vụ thuần (giá, quỹ, trùng lịch, VietQR, giờ VN) ở `src/lib/domain` — không phụ thuộc Next.js/Prisma, để sau tách ra `packages/shared` cho app mobile. Không chọn Flutter vì web Flutter khó lên Google.

---

## 8. Phi chức năng
- **Không trùng lịch:** kiểm tra trong transaction phía máy chủ, tính cả sân ghép; lên PostgreSQL thì thêm exclusion constraint.
- **Múi giờ:** hiển thị giờ Việt Nam (UTC+7, không đổi giờ mùa hè).
- **Tiền:** số nguyên VND, hiển thị `500.000đ`.
- Giao diện tiếng Việt; code/tên biến tiếng Anh.
- Mobile-first (375px).
- SEO: metadata, schema.org, sitemap cho trang sân.
- Kiểm quyền ở máy chủ cho mọi thao tác; SĐT chỉ hiện cho bên liên quan.
- Nghị định 13/2023 về dữ liệu cá nhân; thông báo website TMĐT với Bộ Công Thương trước khi thu phí.

---

## 9. Thứ tự xây dựng
1. Nền móng: dự án, DB, đăng nhập, hồ sơ, danh mục, giao diện chung.
2. Chủ sân: cụm sân, sân con, sân ghép, bảng giá, lịch, đơn tay, khóa giờ, admin duyệt.
3. Tìm & đặt sân: tìm kiếm, bản đồ, trang sân, đặt, cọc VietQR, hủy, đặt cố định, thông báo, đánh giá.
4. ~~Đội bóng & quỹ~~ (đã bỏ).
5. Kèo & cộng đồng.
6. Thống kê chủ sân, gói thu phí, admin, giờ giảm giá, xuất Excel (hiện là CSV).
7. Sau web: PostgreSQL + deploy, app Expo, thêm môn, xác nhận chuyển khoản tự động.

**Trạng thái (2026-10-14):** bước 1–3, 5, 6 đã có bản chạy local (SQLite); bước 4 đã gỡ khỏi code, kèm đăng nhập Google, khu quản trị riêng, lấy vị trí sân từ Google Maps, việc định kỳ (tự hủy đơn chờ, nhắc giờ đá). Chưa làm: bước 7, OTP SMS, thông báo ngoài web (email/Zalo/push), xuất `.xlsx`.

## 10. Còn để ngỏ
- [ ] Thành phố ra mắt: Hà Nội, TP.HCM hay toàn quốc (dữ liệu khu vực hiện có Hà Nội, TP.HCM, Đà Nẵng).
- [ ] Giá gói Pro.
- [ ] Logo & màu thương hiệu.
- [ ] Mua tên miền chonsan.vn.

## 11. Đối thủ đã biết
- **LinkPlay** (linkplay.vn, sở hữu rasan.vn): ghép kèo, tìm người chơi.
- **SPM** (datsan.app): phần mềm quản lý cho chủ sân.
- datsan.vn: đặt lịch của một sân cụ thể.
- **SanBong.vn** (sanbong.vn, xem 2026-10-14): đặt sân đa môn (8 môn, ghi ~445–642 cơ sở, 34 tỉnh), trang SEO tỉnh × môn, đặt không cần tài khoản (chỉ SĐT), báo Zalo/Telegram cho chủ sân, phần mềm chủ sân 99K–299K/tháng. Điểm yếu thấy được: lọc theo môn sai (trang "bóng đá Hà Nội" toàn pickleball), cơ sở trùng lặp, số liệu tự mâu thuẫn, giá trên lịch không khớp bảng giá, ảnh minh họa sai, không có đánh giá, không xử lý sân ghép.
- Khác biệt của ChonSan: **dữ liệu đúng** (sân đã duyệt, giá theo khung giờ chính xác, sân ghép không trùng lịch, đánh giá thật), tập trung bóng đá ở một thành phố trước, **kèo + uy tín** như lựa chọn thêm.
- Việc nên làm để cạnh tranh: đặt sân không bắt đăng nhập; hiện giá đúng khung giờ ngay trên thẻ sân; báo đơn cho chủ sân qua Telegram/Zalo; gói miễn phí rộng hơn (3–4 sân con); trang SEO tỉnh × khu vực × loại sân.
