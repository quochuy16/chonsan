import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import { formatDateTime } from "@/lib/domain/time";
import { Empty } from "@/components/ui";
import { markAllReadAction } from "../actions";

export const metadata = { title: "Thông báo" };

export default async function NotificationsPage() {
  const user = await requireUser("/tai-khoan/thong-bao");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="container-page max-w-2xl py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="h1">Thông báo</h1>
        <form action={markAllReadAction}><button className="btn-secondary btn-sm">Đánh dấu đã đọc</button></form>
      </div>
      {items.length === 0 ? <Empty title="Chưa có thông báo" /> : (
        <ul className="card divide-y divide-gray-100 p-0">
          {items.map((n) => (
            <li key={n.id} className={`px-4 py-3 ${n.read ? "" : "bg-brand-50"}`}>
              <Link href={n.link ?? "#"} className="block">
                <p className="font-semibold">{!n.read && <span className="mr-1 text-brand-600">●</span>}{n.title}</p>
                {n.body && <p className="text-sm text-gray-600">{n.body}</p>}
                <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(n.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
