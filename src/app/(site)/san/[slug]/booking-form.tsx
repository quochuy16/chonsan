"use client";
import { useMemo, useState } from "react";
import { quote, depositFor, parseDays } from "@/lib/domain/pricing";
import { formatVND } from "@/lib/domain/money";
import { dowOfKey, minutesToHHMM } from "@/lib/domain/time";
import { SubmitButton } from "@/components/submit-button";

interface Props {
  action: (form: FormData) => void;
  pitches: { id: string; name: string; size: string }[];
  rules: { pitchId: string | null; daysOfWeek: string; startMin: number; endMin: number; pricePerHour: number }[];
  holidays: { date: string; percent: number }[];
  deals: { date: string; startMin: number; endMin: number; percent: number }[];
  dates: { key: string; label: string }[];
  openMin: number;
  closeMin: number;
  depositType: string;
  depositValue: number;

  initial: { pitchId?: string; date: string; start?: number };
  loggedIn: boolean;
  loginHref: string;
}

export function BookingForm(p: Props) {
  const [pitchId, setPitchId] = useState(p.initial.pitchId ?? p.pitches[0]?.id ?? "");
  const [date, setDate] = useState(p.initial.date);
  const [start, setStart] = useState(p.initial.start ?? Math.max(p.openMin, 18 * 60));
  const [duration, setDuration] = useState(90);
  const [weeks, setWeeks] = useState(1);

  const q = useMemo(() => {
    const rules = p.rules.map((r) => ({ ...r, daysOfWeek: parseDays(r.daysOfWeek) }));
    return quote({
      rules, pitchId, dow: dowOfKey(date), startMin: start, endMin: start + duration,
      holidayPercent: p.holidays.find((h) => h.date === date)?.percent,
      deals: p.deals.filter((d) => d.date === date),
    });
  }, [p.rules, p.holidays, p.deals, pitchId, date, start, duration]);
  const deposit = q.ok ? depositFor(q.total, p.depositType, p.depositValue) : 0;
  const starts: number[] = [];
  for (let m = p.openMin; m + 60 <= p.closeMin; m += 30) starts.push(m);
  const overClose = start + duration > p.closeMin;

  return (
    <form action={p.action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label" htmlFor="pitchId">Sân</label>
          <select id="pitchId" name="pitchId" className="input" value={pitchId} onChange={(e) => setPitchId(e.target.value)}>
            {p.pitches.map((x) => <option key={x.id} value={x.id}>{x.name} (sân {x.size})</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label" htmlFor="date">Ngày</label>
          <select id="date" name="date" className="input" value={date} onChange={(e) => setDate(e.target.value)}>
            {p.dates.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="startMin">Giờ bắt đầu</label>
          <select id="startMin" name="startMin" className="input" value={start} onChange={(e) => setStart(Number(e.target.value))}>
            {starts.map((m) => <option key={m} value={m}>{minutesToHHMM(m)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="duration">Thời lượng</label>
          <select id="duration" name="duration" className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {[60, 90, 120, 150, 180].map((d) => <option key={d} value={d}>{d} phút</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="weeks">Lặp hằng tuần</label>
          <select id="weeks" name="weeks" className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
            <option value={1}>Không lặp</option>
            {[4, 8, 12].map((w) => <option key={w} value={w}>{w} tuần (cố định)</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label" htmlFor="note">Ghi chú cho chủ sân</label>
          <input id="note" name="note" className="input" placeholder="VD: cần thêm 2 bóng, áo bib" maxLength={200} />
        </div>
      </div>

      <div className="rounded-xl bg-brand-50 p-3 text-sm">
        {overClose ? (
          <p className="text-red-600">Sân đóng cửa lúc {minutesToHHMM(p.closeMin)}.</p>
        ) : q.ok ? (
          <>
            <div className="flex justify-between"><span>{minutesToHHMM(start)}–{minutesToHHMM(start + duration)}</span>
              <span className="font-bold text-brand-800">{formatVND(q.total)}{weeks > 1 ? " / buổi" : ""}</span></div>
            {q.discount > 0 && <p className="text-xs text-brand-700">Đã giảm {formatVND(q.discount)} (giờ trống)</p>}
            {q.holidayPercent !== 100 && <p className="text-xs text-amber-700">Giá ngày lễ: {q.holidayPercent}%</p>}
            {deposit > 0 && <p className="mt-1 text-xs text-gray-600">Cần cọc {formatVND(deposit)}{weeks > 1 ? "/buổi" : ""} qua chuyển khoản sau khi đặt.</p>}
          </>
        ) : (
          <p className="text-red-600">Chưa có giá cho khung {minutesToHHMM(q.unpricedAt ?? start)} ngày này — liên hệ chủ sân.</p>
        )}
      </div>
      {p.loggedIn ? (
        <SubmitButton className="btn-primary w-full">{weeks > 1 ? `Đặt cố định ${weeks} buổi` : "Đặt sân"}</SubmitButton>
      ) : (
        <a href={p.loginHref} className="btn-primary w-full">Đăng nhập để đặt sân</a>
      )}
    </form>
  );
}
