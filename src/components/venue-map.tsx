"use client";
import dynamic from "next/dynamic";

export const VenueMap = dynamic(() => import("./venue-map-inner"), {
  ssr: false,
  loading: () => <div className="grid h-[360px] place-items-center rounded-2xl bg-gray-100 text-sm text-gray-500">Đang tải bản đồ…</div>,
});
