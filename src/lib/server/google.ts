import { createHash, randomBytes } from "node:crypto";
import { decodeJwt } from "jose";
import { EnvHttpProxyAgent, fetch as proxyFetch } from "undici";

// Đăng nhập Google: OAuth 2.0 Authorization Code + PKCE (không dùng thư viện ngoài).
// ID token lấy trực tiếp từ token endpoint của Google qua HTTPS kèm client secret, nên theo
// OpenID Connect Core §3.1.3.7 được phép dùng mà không cần kiểm chữ ký; vẫn kiểm iss/aud/exp/email.

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const OAUTH_COOKIE = "cs_google_oauth";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// fetch có sẵn của Node bỏ qua HTTPS_PROXY; mạng công ty cần đi qua proxy. Agent này tự dùng proxy
// khi có biến HTTP(S)_PROXY và tôn trọng NO_PROXY; không có biến thì kết nối thẳng.
const agent = new EnvHttpProxyAgent();

export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const site = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return { clientId, clientSecret, redirectUri: `${site}/auth/google/callback` };
}

export function isGoogleEnabled(): boolean {
  return googleConfig() !== null;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function randomToken(bytes = 32): string {
  return b64url(randomBytes(bytes));
}

/** PKCE S256: code_challenge = BASE64URL(SHA256(verifier)) */
export function pkceChallenge(verifier: string): string {
  return b64url(createHash("sha256").update(verifier).digest());
}

export function buildAuthUrl(cfg: GoogleConfig, state: string, verifier: string): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${p.toString()}`;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

/** Kiểm các claim bắt buộc của ID token; trả lỗi tiếng Việt nếu không hợp lệ */
export function validateClaims(claims: Record<string, unknown>, clientId: string, nowSec: number): GoogleProfile | string {
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return "Token không đến từ Google";
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(clientId)) return "Token không dành cho ứng dụng này";
  if (typeof claims.exp !== "number" || claims.exp < nowSec - 60) return "Token đã hết hạn, vui lòng thử lại";
  if (typeof claims.sub !== "string" || !claims.sub) return "Token thiếu mã tài khoản";
  if (typeof claims.email !== "string" || claims.email_verified !== true) return "Email Google chưa được xác minh";
  const email = claims.email.toLowerCase();
  const name = typeof claims.name === "string" && claims.name.trim() ? claims.name.trim() : email.split("@")[0];
  return { sub: claims.sub, email, name };
}

/** Đổi code lấy ID token rồi kiểm claim */
export async function exchangeCode(cfg: GoogleConfig, code: string, verifier: string): Promise<GoogleProfile | string> {
  let res;
  try {
    res = await proxyFetch(GOOGLE_TOKEN_URL, {
      dispatcher: agent,
      signal: AbortSignal.timeout(15_000),
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }),
    });
  } catch (e) {
    console.error("[google] token exchange failed", e);
    return "Không kết nối được tới Google, vui lòng thử lại sau";
  }
  if (!res.ok) return "Google từ chối yêu cầu đăng nhập, vui lòng thử lại";
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) return "Google không trả về thông tin tài khoản";
  return validateClaims(decodeJwt(json.id_token), cfg.clientId, Math.floor(Date.now() / 1000));
}
