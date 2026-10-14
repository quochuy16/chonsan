---
name: chonsan-domain
description: Thuật ngữ bóng phủi Việt Nam và quy tắc nghiệp vụ của ChonSan (giá sân theo khung giờ, sân ghép, trạng thái đơn, uy tín kèo, VietQR). Dùng khi viết hoặc sửa logic đặt sân, cho thuê sân, kèo, hoặc khi cần hiểu một thuật ngữ của người dùng.
---

# Nghiệp vụ ChonSan

## Thuật ngữ
| Người dùng nói | Nghĩa | Trong code |
|---|---|---|
| Cụm sân | Một địa điểm có nhiều sân | `Venue` |
| Sân con, sân 1, sân A | Một mặt sân cụ thể | `Pitch` |
| Sân 5 / 7 / 11 | Số người mỗi đội | `Pitch.size` = "5" / "7" / "11" |
| Sân ghép | Sân 7 tạo bằng cách ghép 2 sân 5 | `PitchLink(parentId, childId)` |
| Giờ vàng | Khung giờ đông, giá cao (thường 17h–21h) | `PriceRule` |
| Cọc | Tiền đặt trước giữ sân | `Booking.depositAmount` |
| Bùng / bùng kèo | Đặt mà không đến | `Booking.status = NO_SHOW`; `MatchRating.noShow` |
| Đặt cố định | Đặt lặp hằng tuần | `Booking.recurringId` |
| Kèo / tìm đối | Đội tìm đội khác để đá (gắn với người đăng, tên đội là chữ) | `MatchPost.teamName`, `MatchRequest.teamName` |
| Tìm người / đá ghép | Đội thiếu người tìm người lẻ | `PlayerPost`, `PlayerRequest` |
| Quỹ đội, điểm danh | **Không làm** (đã bỏ 2026-10-14) | — |
| Khu vực, quận | Tên quận cũ (VN bỏ cấp quận từ 07/2025 nhưng người chơi vẫn gọi vậy) | `district`, danh sách ở `LOCATIONS` |
| Nhân viên sân | Xem lịch, tạo/xác nhận đơn; không xem doanh thu | `VenueStaff` |
| Khóa giờ | Chặn giờ bảo trì | `Booking.status = BLOCKED`, `source = BLOCK` |
| Đơn tay | Khách gọi điện, chủ sân nhập | `Booking.source = MANUAL` |
| Gói Pro | Gói trả phí của chủ sân | `Venue.plan`, giới hạn ở `PLAN_LIMITS` |

## Quy tắc
1. **Giá** (`pricing.ts`): mỗi `PriceRule` có `daysOfWeek` (0=CN…6=T7), `startMin`–`endMin` (phút trong ngày, giờ VN), `pricePerHour`, `pitchId` (null = mọi sân con của cụm). Rule gắn sân con cụ thể thắng rule chung. Đơn được cắt theo bước 30 phút; mỗi bước lấy giá của rule khớp. Ngày lễ (`VenueHoliday.percent`) nhân lên toàn bộ. Có `Deal` (giảm giá giờ trống) thì trừ % trên phần giao nhau. Tổng làm tròn tới 1.000đ. Không có rule khớp → không cho đặt khung đó.
2. **Trùng lịch**: hai khoảng `[start, end)` trùng khi `aStart < bEnd && bStart < aEnd`. Khi đặt sân X, phải kiểm tra X + mọi sân cha/con ghép với X. Đơn `CANCELLED` không chiếm chỗ. `BLOCKED` (khóa giờ) có chiếm chỗ.
3. **Trạng thái đơn**: `PENDING → CONFIRMED → COMPLETED`; `PENDING/CONFIRMED → CANCELLED`; `CONFIRMED → NO_SHOW`. Hủy bởi người đặt chỉ khi còn ≥ `Venue.cancelHours` giờ trước giờ đá. `Venue.autoConfirm` bật thì đơn online vào thẳng `CONFIRMED`.
3b. **Việc định kỳ** (`jobs.ts`, logic ở `schedule.ts`): đơn `PENDING` tự hủy khi chờ ≥ `Venue.pendingExpireMin` phút (0 = không hủy theo thời gian chờ) hoặc đã tới giờ đá; đơn qua giờ → `COMPLETED`; nhắc giờ đá trước `REMINDER_LEAD_MIN` = 120 phút, một lần (`reminderSentAt`), cho người đặt. Mọi cập nhật dùng `updateMany` có điều kiện trạng thái để idempotent.
4. **Cọc**: `depositType` NONE / FIXED (đồng) / PERCENT (% tổng tiền, làm tròn lên nghìn đồng).
5. **Kèo**: chỉ người đăng được chốt/hủy kèo; chốt thì các yêu cầu khác `REJECTED`, hai bên thấy SĐT nhau. Không có quản lý đội — đừng thêm bảng `Team`.
6. **Uy tín (theo người)**: `MatchRating(fromUserId → toUserId)`, chỉ hai bên của kèo đã chốt, sau giờ đá. Điểm = trung bình (đúng giờ + fair-play + đúng trình độ)/3 trên thang 5, trừ 0,5 điểm mỗi lần bùng kèo, tối thiểu 0. Chưa có đánh giá → hiển thị "Mới".
7. **VietQR**: payload EMVCo (Napas 247), `src/lib/domain/vietqr.ts`. Nội dung chuyển khoản không dấu, ≤ 25 ký tự.
8. **Cấm cá cược**: không thêm trường mức cược, không tính thắng thua tiền giữa các đội. Nội dung người dùng ở phần kèo phải qua `containsBettingTerms()` (`moderation.ts`); regex tiếng Việt dùng `(?<![\p{L}\p{N}])…(?![\p{L}\p{N}])` với cờ `u`, không dùng `\b`.
9. **Gói**: FREE tối đa 1 cụm sân, 2 sân con; PRO không giới hạn (`PLAN_LIMITS`). Admin bật Pro thủ công.
