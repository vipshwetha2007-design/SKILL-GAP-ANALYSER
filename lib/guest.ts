import { prisma } from "./prisma";

/**
 * There is no login anymore, but Report and InterviewReport still keep a
 * `userId` foreign key (harmless to leave in place — see prisma/schema.prisma).
 * Rather than touch that schema, every saved report/interview report is
 * attributed to one fixed local "Guest" row, created lazily the first time
 * something is actually saved. Callers only reach this after confirming
 * `isDatabaseConfigured()`, so it's never invoked when there's no database.
 */
export const GUEST_USER_ID = "guest-local";

export async function ensureGuestUser() {
  return prisma.user.upsert({
    where: { id: GUEST_USER_ID },
    update: {},
    create: {
      id: GUEST_USER_ID,
      name: "Guest",
      email: "guest@local.invalid",
      emailVerified: true,
    },
  });
}
