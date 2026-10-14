import { REPORT_REASONS } from "@/lib/domain/constants";
import { reportAction } from "@/app/(site)/keo/actions";

export function ReportForm({ targetType, targetId, back }: { targetType: string; targetId: string; back: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-gray-400">Báo cáo vi phạm</summary>
      <form action={reportAction.bind(null, targetType, targetId, back)} className="mt-2 space-y-2">
        <select name="reason" className="input" aria-label="Lý do">{Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <textarea name="detail" rows={2} className="input" placeholder="Mô tả ngắn" aria-label="Mô tả" />
        <button className="btn-danger btn-sm">Gửi báo cáo</button>
      </form>
    </details>
  );
}
