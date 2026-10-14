import { describe, expect, it } from "vitest";
import { buildAuthUrl, pkceChallenge, validateClaims } from "./google";

const cfg = { clientId: "abc.apps.googleusercontent.com", clientSecret: "x", redirectUri: "http://localhost:3000/auth/google/callback" };
const now = 1_800_000_000;
const good = { iss: "https://accounts.google.com", aud: cfg.clientId, exp: now + 3600, sub: "1234", email: "Duc@Gmail.com", email_verified: true, name: "Đức" };

describe("google oauth", () => {
  it("PKCE S256 theo vector mẫu RFC 7636", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
  it("URL đăng nhập có đủ tham số", () => {
    const u = new URL(buildAuthUrl(cfg, "st", "verifier"));
    expect(u.origin + u.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(u.searchParams.get("redirect_uri")).toBe(cfg.redirectUri);
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("state")).toBe("st");
    expect(u.searchParams.get("scope")).toBe("openid email profile");
  });
  it("claim hợp lệ → hồ sơ, email chữ thường", () => {
    expect(validateClaims(good, cfg.clientId, now)).toEqual({ sub: "1234", email: "duc@gmail.com", name: "Đức" });
  });
  it("từ chối claim sai", () => {
    expect(typeof validateClaims({ ...good, aud: "khac" }, cfg.clientId, now)).toBe("string");
    expect(typeof validateClaims({ ...good, iss: "https://evil.com" }, cfg.clientId, now)).toBe("string");
    expect(typeof validateClaims({ ...good, exp: now - 3600 }, cfg.clientId, now)).toBe("string");
    expect(typeof validateClaims({ ...good, email_verified: false }, cfg.clientId, now)).toBe("string");
  });
});
