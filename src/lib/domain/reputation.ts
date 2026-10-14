export interface RatingInput {
  punctual: number;
  fairplay: number;
  levelMatch: number;
  noShow: boolean;
}

export interface Reputation {
  score: number | null; // thang 5, null = chưa có đánh giá
  count: number;
  noShows: number;
}

export const NO_SHOW_PENALTY = 0.5;

export function computeReputation(ratings: RatingInput[]): Reputation {
  if (ratings.length === 0) return { score: null, count: 0, noShows: 0 };
  const scored = ratings.filter((r) => !r.noShow);
  const noShows = ratings.length - scored.length;
  const avg = scored.length
    ? scored.reduce((s, r) => s + (r.punctual + r.fairplay + r.levelMatch) / 3, 0) / scored.length
    : 0;
  const score = Math.max(0, Math.round((avg - noShows * NO_SHOW_PENALTY) * 10) / 10);
  return { score, count: ratings.length, noShows };
}
