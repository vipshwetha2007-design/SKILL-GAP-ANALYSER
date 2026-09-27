import { prisma } from "./prisma";
import { isDatabaseConfigured } from "./db-status";
import { DEFAULT_COMPANIES, type CompanyRequirements } from "./scoring";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
}

/** The original 10 companies, each given a stable id so the analyzer can
 * select/key them the same way it would DB rows. Used only when no
 * DATABASE_URL is configured — this is what makes the analyzer work with
 * zero setup. */
export const LOCAL_DEFAULT_COMPANIES: CompanyRequirements[] = DEFAULT_COMPANIES.map((c) => ({
  ...c,
  id: `local-${slugify(c.name)}`,
}));

/**
 * The dream-company benchmark list. Reads from Postgres when DATABASE_URL
 * is set (so admin edits, interview-report aggregation, AI research, and
 * job-postings suggestions all show up live); otherwise falls back to the
 * built-in defaults, which is what lets the analyzer run with no database
 * at all.
 */
export async function getCompanies(): Promise<CompanyRequirements[]> {
  if (!isDatabaseConfigured()) return LOCAL_DEFAULT_COMPANIES;
  return prisma.company.findMany({ orderBy: { name: "asc" } });
}
