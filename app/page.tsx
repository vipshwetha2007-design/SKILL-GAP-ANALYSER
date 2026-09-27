import { Navbar } from "@/components/layout/Navbar";
import { Analyzer } from "@/components/analyzer/Analyzer";
import { getCompanies } from "@/lib/companies";

export const dynamic = "force-dynamic";

/**
 * The analyzer, directly at "/" — no login wall. Company benchmarks come
 * from Postgres when DATABASE_URL is set, or from the built-in defaults
 * otherwise (see lib/companies.ts), so this loads with zero setup.
 */
export default async function HomePage() {
  const companies = await getCompanies();

  return (
    <>
      <Navbar />
      <Analyzer companies={companies} userName="" />
    </>
  );
}
