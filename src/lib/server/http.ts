import { EnvHttpProxyAgent, fetch as undiciFetch } from "undici";

// fetch có sẵn của Node bỏ qua HTTPS_PROXY; mạng công ty cần đi qua proxy. Agent này tự dùng proxy
// khi có biến HTTP(S)_PROXY (kể cả khai báo trong .env) và tôn trọng NO_PROXY; không có thì kết nối thẳng.
const agent = new EnvHttpProxyAgent();

export type ExternalFetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: URLSearchParams; redirect?: "manual" | "follow"; timeoutMs?: number }) => Promise<{
  status: number;
  ok: boolean;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

/** Gọi API/trang bên ngoài từ máy chủ (qua proxy nếu có), mặc định timeout 15 giây */
export const externalFetch: ExternalFetch = (url, init = {}) =>
  undiciFetch(url, {
    dispatcher: agent,
    method: init.method ?? "GET",
    headers: init.headers,
    body: init.body,
    redirect: init.redirect ?? "follow",
    signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
  });
