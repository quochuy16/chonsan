import Link from "next/link";
import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { formatVND } from "@/lib/domain/money";
import { fromVN, todayKey } from "@/lib/domain/time";
import { Badge, Empty } from "@/components/ui";

export const metadata = { title: "Phần mềm quản lý sân bóng", description: "ChonSan cho chủ sân: lịch sân không trùng giờ, bảng giá theo khung giờ, nhận đặt online, thu cọc VietQR, thống kê doanh thu. Miễn phí cho sân nhỏ." };

const STATUS = { PENDING: ["Chờ duyệt", "amber"], APPROVED: ["Đang hiển thị", "green"], REJECTED: ["Bị từ chối", "red"] } as const;

export default async function OwnerHome() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="container-page max-w-3xl py-12 text-center">
        <h1 className="h1">Quản lý sân bóng — thay sổ tay bằng ChonSan</h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-600">Lịch sân trực quan không trùng giờ, bảng giá theo khung giờ, nhận đặt online, thu cọc qua VietQR, thống kê doanh thu và tỉ lệ lấp sân.</p>
        <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[["📅", "Lịch sân", "Mỗi sân con một cột, đặt cố định, sân ghép 5→7 tự khóa"], ["💸", "Cọc VietQR", "Khách quét mã chuyển thẳng cho bạn, không qua trung gian"], ["📊", "Thống kê", "Doanh thu, giờ hay trống, khách quen, tỉ lệ bùng"]].map(([i, t, d]) => (
            <div key={t} className="card"><p className="text-2xl">{i}</p><p className="font-bold">{t}</p><p className="muted">{d}</p></div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/chu-san/dang-ky?next=/chu-san/moi" className="btn-primary">Đăng ký miễn phí</Link>
          <Link href="/chu-san/dang-nhap" className="btn-secondary">Đã có tài khoản? Đăng nhập</Link>
        </div>
      </div>
    );
  }
  const venues = await db.venue.findMany({
    where: { OR: [{ ownerId: user.id }, { staff: { some: { userId: user.id } } }] },
    include: { pitches: true },
    orderBy: { createdAt: "asc" },
  });
  const today = todayKey();
  const todays = await db.booking.findMany({
    where: { pitch: { venueId: { in: venues.map((v) => v.id) } }, start: { gte: fromVN(today, 0), lt: fromVN(today, 1440) }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
    include: { pitch: true },
  });
  const pending = await db.booking.count({ where: { pitch: { venueId: { in: venues.map((v) => v.id) } }, status: "PENDING" } });
  return (
    <div className="container-page py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="h1">Sân của tôi</h1>
        <Link href="/chu-san/moi" className="btn-primary">+ Thêm cụm sân</Link>
      </div>
      {pending > 0 && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Có <strong>{pending}</strong> đơn đang chờ bạn xác nhận.</p>}
      {venues.length === 0 ? (
        <Empty title="Bạn chưa có cụm sân nào" action={{ href: "/chu-san/moi", label: "Đăng ký cụm sân đầu tiên" }}>Đăng ký miễn phí: 1 cụm sân, tối đa 2 sân con.</Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {venues.map((v) => {
            const t = todays.filter((b) => b.pitch.venueId === v.id);
            const [txt, tone] = STATUS[v.status as keyof typeof STATUS] ?? ["?", "gray"];
            return (
              <Link key={v.id} href={`/chu-san/${v.id}`} className="card block hover:border-brand-500">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-bold">{v.name}</p><p className="muted">{v.address}, {v.district}</p></div>
                  <div className="flex flex-col items-end gap-1"><Badge tone={tone}>{txt}</Badge>{v.plan === "PRO" && <Badge tone="blue">Pro</Badge>}{v.ownerId !== user.id && <Badge>Nhân viên</Badge>}</div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-gray-50 p-2"><p className="text-lg font-bold">{v.pitches.length}</p><p className="text-xs text-gray-500">sân con</p></div>
                  <div className="rounded-xl bg-gray-50 p-2"><p className="text-lg font-bold">{t.length}</p><p className="text-xs text-gray-500">đơn hôm nay</p></div>
                  <div className="rounded-xl bg-gray-50 p-2"><p className="text-lg font-bold">{formatVND(t.reduce((a, b) => a + b.totalPrice, 0))}</p><p className="text-xs text-gray-500">hôm nay</p></div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
