import { db } from "./db";
import type { CurrentUser } from "./auth";

export async function getVenueAccess(venueId: string, user: CurrentUser | null) {
  if (!user) return null;
  const venue = await db.venue.findUnique({ where: { id: venueId }, include: { staff: true } });
  if (!venue) return null;
  const isOwner = venue.ownerId === user.id;
  const isStaff = venue.staff.some((s) => s.userId === user.id);
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isStaff && !isAdmin) return null;
  return { venue, isOwner: isOwner || isAdmin, isStaff };
}

