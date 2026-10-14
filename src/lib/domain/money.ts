/** 500000 -> "500.000đ" */
export function formatVND(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const s = Math.abs(Math.round(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${s}đ`;
}

/** 350000 -> "350k", 1200000 -> "1,2tr" */
export function formatVNDShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "").replace(".", ",")}tr`;
  }
  return `${Math.round(amount / 1000)}k`;
}

export function roundUpThousand(amount: number): number {
  return Math.ceil(amount / 1000) * 1000;
}

export function roundThousand(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}
