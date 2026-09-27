/**
 * External-jobs source for the benchmark-freshness system, backed by
 * JSearch on RapidAPI (real, currently-live job postings — effectively a
 * Google for Jobs search). Like lib/ai-research.ts, this never writes to a
 * Company directly: it returns a proposed benchmark that the calling route
 * files as a PENDING BenchmarkSuggestion for an admin to review.
 *
 * Method: pull the current job postings for "<role> at <company>", then
 * measure what fraction of those postings actually mention each skill.
 * That's a real, current signal (not a guess) but a blunt one — presence in
 * a job description isn't the same as an interview bar — so scores are
 * capped at 9/10 and the rationale always says how many postings were read,
 * so an admin can judge the sample size before approving.
 */

export class ExternalJobsNotConfiguredError extends Error {
  constructor() {
    super("The external jobs API isn't configured yet — set RAPIDAPI_KEY to enable it.");
    this.name = "ExternalJobsNotConfiguredError";
  }
}

export interface ExternalJobsResult {
  java?: number;
  python?: number;
  sql?: number;
  dsa?: number;
  communication?: number;
  rationale: string;
  citationUrl?: string;
  postingsAnalyzed: number;
}

type SkillKey = "java" | "python" | "sql" | "dsa" | "communication";

// Keyword sets used to detect a skill's presence in a job description's
// free text. Deliberately simple substring matching — good enough for a
// "how often does this come up" signal, not meant to be a parser.
const SKILL_KEYWORDS: Record<SkillKey, string[]> = {
  java: ["java ", "java,", "java.", "java/", "java)"],
  python: ["python"],
  sql: ["sql", "postgres", "mysql", "database quer"],
  dsa: ["data structures", "algorithms", "leetcode", "competitive programming"],
  communication: ["communication skills", "stakeholder", "presentation skills", "collaborat"],
};

interface JSearchJob {
  job_title?: string;
  job_description?: string;
  employer_name?: string;
  job_apply_link?: string;
  job_google_link?: string;
}

/**
 * Fetches current postings for `companyName` via JSearch and scores how
 * often each tracked skill shows up in them. Throws
 * `ExternalJobsNotConfiguredError` when RAPIDAPI_KEY isn't set — callers
 * should catch that specifically, same pattern as researchCompanyBenchmark.
 */
export async function researchCompanyFromJobPostings(companyName: string): Promise<ExternalJobsResult> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new ExternalJobsNotConfiguredError();

  const url = new URL("https://jsearch.p.rapidapi.com/search-v2");
  url.searchParams.set("query", `software engineer at ${companyName}`);
  url.searchParams.set("num_pages", "1");
  url.searchParams.set("date_posted", "month");

  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });
  if (!res.ok) {
    throw new Error(`JSearch request failed (${res.status}). Check RAPIDAPI_KEY and your RapidAPI subscription.`);
  }

  const json = (await res.json()) as { data?: { jobs?: JSearchJob[] } | JSearchJob[] };
  
  // Handle both the old /search structure (array) and the new /search-v2 structure (object with jobs array)
  let rawJobs: JSearchJob[] = [];
  if (Array.isArray(json.data)) {
    rawJobs = json.data;
  } else if (json.data && Array.isArray(json.data.jobs)) {
    rawJobs = json.data.jobs;
  }

  const jobs = rawJobs.filter((j) => j.job_description);
  if (jobs.length === 0) {
    throw new Error(`No current job postings found for "${companyName}" — try again later, or check the company name matches how it's listed on job boards.`);
  }

  const hits: Record<SkillKey, number> = { java: 0, python: 0, sql: 0, dsa: 0, communication: 0 };
  for (const job of jobs) {
    const text = `${job.job_title ?? ""} ${job.job_description ?? ""}`.toLowerCase();
    for (const skill of Object.keys(SKILL_KEYWORDS) as SkillKey[]) {
      if (SKILL_KEYWORDS[skill].some((kw) => text.includes(kw))) hits[skill]++;
    }
  }

  // Fraction of postings mentioning a skill -> a 0-9 bar. Capped below 10
  // on purpose: appearing in every job ad still isn't proof of a 10/10
  // interview bar, just that the skill is table-stakes for the role.
  const toScore = (count: number) => Math.min(9, Math.round((count / jobs.length) * 10));

  const scores: Record<SkillKey, number> = {
    java: toScore(hits.java),
    python: toScore(hits.python),
    sql: toScore(hits.sql),
    dsa: toScore(hits.dsa),
    communication: toScore(hits.communication),
  };

  const breakdown = (Object.keys(hits) as SkillKey[])
    .map((k) => `${k} in ${hits[k]}/${jobs.length}`)
    .join(", ");
  const rationale = `Estimated from ${jobs.length} current job posting${jobs.length === 1 ? "" : "s"} for ${companyName} via JSearch (${breakdown}).`;

  const citationUrl = jobs[0]?.job_apply_link ?? jobs[0]?.job_google_link ?? undefined;

  return { ...scores, rationale, citationUrl, postingsAnalyzed: jobs.length };
}
