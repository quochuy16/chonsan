import QRCode from "qrcode";
import { BANKS, buildVietQR, sanitizeTransferNote } from "@/lib/domain/vietqr";
import { formatVND } from "@/lib/domain/money";

export async function VietQR({
  bankBin,
  account,
  accountName,
  amount,
  note,
}: {
  bankBin: string | null;
  account: string | null;
  accountName?: string | null;
  amount?: number;
  note?: string;
}) {
  if (!bankBin || !account) {
    return <p className="muted">Chưa có thông tin chuyển khoản. Vui lòng liên hệ trực tiếp.</p>;
  }
  const payload = buildVietQR({ bankBin, account, amount, note });
  const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Mã VietQR chuyển khoản" width={180} height={180} className="rounded-xl border" />
      <dl className="grid grid-cols-1 gap-1 text-sm">
        <div>
          <dt className="inline text-gray-500">Ngân hàng: </dt>
          <dd className="inline font-medium">{BANKS[bankBin] ?? bankBin}</dd>
        </div>
        <div>
          <dt className="inline text-gray-500">Số tài khoản: </dt>
          <dd className="inline font-mono font-medium">{account}</dd>
        </div>
        {accountName && (
          <div>
            <dt className="inline text-gray-500">Chủ tài khoản: </dt>
            <dd className="inline font-medium">{accountName}</dd>
          </div>
        )}
        {amount ? (
          <div>
            <dt className="inline text-gray-500">Số tiền: </dt>
            <dd className="inline font-bold text-brand-700">{formatVND(amount)}</dd>
          </div>
        ) : null}
        {note && (
          <div>
            <dt className="inline text-gray-500">Nội dung: </dt>
            <dd className="inline font-mono">{sanitizeTransferNote(note)}</dd>
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">Mở app ngân hàng → Quét QR. Tiền chuyển thẳng tới tài khoản trên.</p>
      </dl>
    </div>
  );
}
