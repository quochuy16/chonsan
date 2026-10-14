---
name: chonsan-domain
description: Thuật ngữ bóng phủi Việt Nam và quy tắc nghiệp vụ của ChọnSân (giá sân theo khung giờ, sân ghép, trạng thái đơn, quỹ đội, chia tiền trận, uy tín kèo, VietQR). Dùng khi viết hoặc sửa logic đặt sân, quỹ đội, kèo, hoặc khi cần hiểu một thuật ngữ của người dùng.
---

# Nghiệp vụ ChọnSân

## Thuật ngữ
| Người dùng nói | Nghĩa | Trong code |
|---|---|---|
| Cụm sân | Một địa điểm có nhiều sân | `Venue` |
| Sân con, sân 1, sân A | Một mặt sân cụ thể | `Pitch` |
| Sân 5 / 7 / 11 | Số người mỗi đội | `Pitch.size` = "5" / "7" / "11" |
| Sân ghép | Sân 7 tạo bằng cách ghép 2 sân 5 | `PitchLink(parentId, childId)` |
| Giờ vàng | Khung giờ đông, giá cao (thường 17h–21h) | `PriceRule` |
| Cọc | Tiền đặt trước giữ sân | `Booking.depositAmount` |
| Bùng / bùng kèo | Đặt mà không đến | `Booking.status = NO_SHOW`; `TeamRating.noShow` |
| Đặt cố định | Đặt lặp hằng tuần | `Booking.recurringId` |
| Kèo / tìm đối | Đội tìm đội khác để đá | `MatchPost`, `MatchRequest` |
| Tìm người / đá ghép | Đội thiếu người tìm người lẻ | `PlayerPost`, `PlayerRequest` |
| Quỹ tháng | Mỗi thành viên đóng định kỳ | `FundTransaction` kind `CHARGE` category `MONTHLY` |
| Tiền trận | Chia tiền sân/nước cho người có mặt | `CHARGE` category `MATCH` |

## Quy tắc
1. **Giá**: mỗi `PriceRule` có `daysOfWeek` (0=CN…6=T7), `startMin`–`endMin` (phút trong ngày, giờ VN), `pricePerHour`, `pitchId` (null = mọi sân con của cụm). Rule gắn sân con cụ thể thắng rule chung. Đơn được cắt theo bước 30 phút; mỗi bước lấy giá của rule khớp. Ngày lễ (`VenueHoliday.percent`) nhân lên toàn bộ. Có `Deal` (giảm giá giờ trống) thì trừ % trên phần giao nhau. Không có rule khớp → không cho đặt khung đó.
2. **Trùng lịch**: hai khoảng `[start, end)` trùng khi `aStart < bEnd && bStart < aEnd`. Khi đặt sân X, phải kiểm tra X + mọi sân cha/con ghép với X. Đơn `CANCELLED` không chiếm chỗ. `BLOCKED` (khóa giờ) có chiếm chỗ.
3. **Trạng thái đơn**: `PENDING → CONFIRMED → COMPLETED`; `PENDING/CONFIRMED → CANCELLED`; `CONFIRMED → NO_SHOW`. Hủy bởi người đặt chỉ khi còn ≥ `Venue.cancelHours` giờ trước giờ đá.
4. **Cọc**: `depositType` NONE / FIXED (đồng) / PERCENT (% tổng tiền, làm tròn lên nghìn đồng).
5. **Quỹ đội**: số dư quỹ = Σ`PAYMENT` + Σ`INCOME` − Σ`EXPENSE`. Nợ thành viên = Σ`CHARGE` − Σ`PAYMENT` của người đó (âm = đóng dư). Chia tiền trận: chia đều làm tròn **lên** tới 1.000đ (thủ quỹ không bị lỗ). Mọi thêm/sửa/xóa giao dịch ghi `FundAuditLog`; xóa là xóa mềm (`deletedAt`).
6. **Uy tín đội**: trung bình (đúng giờ + fair-play + đúng trình độ)/3 trên thang 5, trừ 0,5 điểm mỗi lần bùng kèo, tối thiểu 0. Chưa có đánh giá → hiển thị "Mới".
7. **VietQR**: payload EMVCo (Napas 247), `src/lib/domain/vietqr.ts`. Nội dung chuyển khoản không dấu, ≤ 25 ký tự.
8. **Cấm cá cược**: không thêm trường mức cược, không tính thắng thua tiền giữa các đội.
