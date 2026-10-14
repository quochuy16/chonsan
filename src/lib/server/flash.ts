import { redirect } from "next/navigation";

/** Quay lại trang với thông báo lỗi (hiển thị bởi <Flash/>) */
export function fail(path: string, message: string): never {
  redirect(withParam(path, "error", message));
}

export function done(path: string, message: string): never {
  redirect(withParam(path, "ok", message));
}

/** Gắn ?key=value vào path, giữ nguyên #hash ở cuối */
export function withParam(path: string, key: string, value: string) {
  const [beforeHash, hash] = path.split("#");
  const [base, query = ""] = beforeHash.split("?");
  const params = new URLSearchParams(query);
  params.delete("error");
  params.delete("ok");
  params.set(key, value);
  return `${base}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function int(form: FormData, key: string, fallback = 0): number {
  const n = Number(str(form, key).replace(/[.,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function bool(form: FormData, key: string): boolean {
  const v = form.get(key);
  return v === "on" || v === "true" || v === "1";
}
