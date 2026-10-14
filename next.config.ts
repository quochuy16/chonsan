import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Khu quản trị cũ đã chuyển sang giao diện riêng /quan-tri
    return [{ source: "/admin/:path*", destination: "/quan-tri", permanent: false }];
  },
  webpack: (config) => {
    // Ổ đĩa không phải NTFS (vd exFAT) trả EISDIR khi webpack gọi readlink → tắt phân giải symlink
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
