// Hai web dùng chung code + database:
//   - Tìm sân (người chơi):  SITE_URL,  vd https://chonsan.vn
//   - Chủ sân (quản lý sân): OWNER_URL, vd https://chusan.chonsan.vn — mọi trang nằm dưới /chu-san
// OWNER_URL trống (local) → cả hai chạy chung một host, link giữ dạng tương đối.
export const OWNER_PREFIX = "/chu-san";
export const OWNER_LOGIN = "/chu-san/dang-nhap";
export const OWNER_REGISTER = "/chu-san/dang-ky";

export function isOwnerPath(path: string): boolean {
  return path === OWNER_PREFIX || path.startsWith(`${OWNER_PREFIX}/`) || path.startsWith(`${OWNER_PREFIX}?`);
}

function splitHosts(): { site: string; owner: string } | null {
  const site = process.env.SITE_URL, owner = process.env.OWNER_URL;
  return site && owner ? { site, owner } : null;
}

/** Link tới web Chủ sân (tuyệt đối khi hai web ở hai tên miền) */
export function ownerUrl(path: string = OWNER_PREFIX): string {
  const h = splitHosts();
  return h ? new URL(path, h.owner).toString() : path;
}

/** Link tới web Tìm sân (tuyệt đối khi hai web ở hai tên miền) */
export function siteUrl(path: string = "/"): string {
  const h = splitHosts();
  return h ? new URL(path, h.site).toString() : path;
}
