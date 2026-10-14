import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { withParam } from "./flash";

describe("withParam", () => {
  it("giữ hash ở cuối URL", () => {
    expect(withParam("/san/abc#dat-san", "error", "Trùng giờ")).toBe("/san/abc?error=Tr%C3%B9ng+gi%E1%BB%9D#dat-san");
  });
  it("thay thông báo cũ, giữ query khác", () => {
    expect(withParam("/chu-san/1?date=2026-10-17&ok=x", "error", "y")).toBe("/chu-san/1?date=2026-10-17&error=y");
  });
});
