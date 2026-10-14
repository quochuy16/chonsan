"use client";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

export function FundEntryForm({ action, members, kinds, categories, today }: {
  action: (f: FormData) => void;
  members: { id: string; name: string }[];
  kinds: Record<string, string>;
  categories: Record<string, Record<string, string>>;
  today: string;
}) {
  const [kind, setKind] = useState("PAYMENT");
  const needsMember = kind === "PAYMENT" || kind === "CHARGE";
  const cats = categories[kind] ?? {};
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-1">
        {Object.entries(kinds).map(([k, v]) => (
          <button type="button" key={k} onClick={() => setKind(k)} className={kind === k ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>{v}</button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      {needsMember && (
        <select name="memberId" className="input" required aria-label="Thành viên">
          <option value="">Chọn thành viên</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
      {Object.keys(cats).length > 0 && (
        <select name="category" className="input" aria-label="Danh mục" key={kind}>
          {Object.entries(cats).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      )}
      <div className="grid grid-cols-2 gap-2">
        <input name="amount" className="input" placeholder="Số tiền" inputMode="numeric" required aria-label="Số tiền" />
        <input name="date" type="date" defaultValue={today} className="input" aria-label="Ngày" />
      </div>
      <input name="note" className="input" placeholder="Ghi chú" aria-label="Ghi chú" />
      <SubmitButton className="btn-primary w-full">Ghi vào sổ</SubmitButton>
    </form>
  );
}
