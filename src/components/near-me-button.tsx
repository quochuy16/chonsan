"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function NearMeButton({ basePath = "/san" }: { basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={() => {
        if (!navigator.geolocation) return setState("error");
        setState("loading");
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const next = new URLSearchParams(params.toString());
            next.set("lat", pos.coords.latitude.toFixed(5));
            next.set("lng", pos.coords.longitude.toFixed(5));
            next.set("sort", "distance");
            next.delete("province");
            next.delete("district");
            setState("idle");
            router.push(`${basePath}?${next.toString()}`);
          },
          () => setState("error"),
          { enableHighAccuracy: false, timeout: 10000 },
        );
      }}
    >
      📍 {state === "loading" ? "Đang định vị…" : state === "error" ? "Không lấy được vị trí" : "Sân gần tôi"}
    </button>
  );
}
