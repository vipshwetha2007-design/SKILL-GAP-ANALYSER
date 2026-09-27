import { NextRequest, NextResponse } from "next/server";
import { extractSkills } from "@/lib/skill-parser";

interface JSearchJob {
  job_title?: string;
  job_description?: string;
  employer_name?: string;
  job_apply_link?: string;
  job_google_link?: string;
}

export async function GET(req: NextRequest) {
  try {
    const company = req.nextUrl.searchParams.get("company");
    if (!company) {
      return NextResponse.json({ error: "Missing company parameter" }, { status: 400 });
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "RAPIDAPI_KEY not configured" }, { status: 500 });
    }

    const url = new URL("https://jsearch.p.rapidapi.com/search-v2");
    url.searchParams.set("query", `software engineer at ${company}`);
    url.searchParams.set("num_pages", "1");
    url.searchParams.set("date_posted", "month");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

    let res;
    try {
      res = await fetch(url.toString(), {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
        signal: controller.signal
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error("JSearch API request timed out after 12 seconds");
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      throw new Error(`JSearch API error: ${res.status}`);
    }

    const json = (await res.json()) as { data?: { jobs?: JSearchJob[] } | JSearchJob[] };
    
    let rawJobs: JSearchJob[] = [];
    if (Array.isArray(json.data)) {
      rawJobs = json.data;
    } else if (json.data && Array.isArray(json.data.jobs)) {
      rawJobs = json.data.jobs;
    }

    const jobs = rawJobs.filter((j) => j.job_description);
    if (jobs.length === 0) {
      return NextResponse.json({ jobsAnalyzed: 0, requiredSkills: [] });
    }

    // Map to aggregate how many jobs mention each skill
    const skillCounts: Record<string, number> = {};

    for (const job of jobs) {
      const text = `${job.job_title ?? ""} ${job.job_description ?? ""}`;
      const foundSkills = extractSkills(text);
      
      // We only care if the skill is present in the job (boolean per job)
      for (const skill of foundSkills) {
        skillCounts[skill.name] = (skillCounts[skill.name] || 0) + 1;
      }
    }

    const requiredSkills = Object.entries(skillCounts).map(([name, count]) => {
      return {
        name,
        percentage: Math.round((count / jobs.length) * 100)
      };
    }).sort((a, b) => b.percentage - a.percentage);

    return NextResponse.json({
      jobsAnalyzed: jobs.length,
      requiredSkills
    });

  } catch (err: any) {
    console.error("Live jobs API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
