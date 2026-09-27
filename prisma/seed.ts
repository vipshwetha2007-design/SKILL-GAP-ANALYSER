/**
 * Seeds the 10 default dream-company benchmarks (the original
 * CompanyDatabase.java data). Safe to re-run — it upserts by name.
 *
 * Users are deliberately NOT seeded here: Better Auth owns password
 * hashing, and replicating its hash algorithm in a seed script is a
 * good way to create accounts that quietly can't log in. Sign up
 * through the app instead, then promote yourself to admin — see the
 * README's "Make yourself an admin" section.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DEFAULT_COMPANIES } from "../lib/scoring";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const company of DEFAULT_COMPANIES) {
    await prisma.company.upsert({
      where: { name: company.name },
      update: {
        description: company.description,
        java: company.java,
        python: company.python,
        sql: company.sql,
        dsa: company.dsa,
        communication: company.communication,
        projects: company.projects,
        certifications: company.certifications,
      },
      create: {
        name: company.name,
        description: company.description,
        java: company.java,
        python: company.python,
        sql: company.sql,
        dsa: company.dsa,
        communication: company.communication,
        projects: company.projects,
        certifications: company.certifications,
      },
    });
  }
  console.log(`Seeded ${DEFAULT_COMPANIES.length} companies.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
