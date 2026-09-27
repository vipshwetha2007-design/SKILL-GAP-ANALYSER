/**
 * lib/scoring.ts
 *
 * The whole skill-gap analysis engine, ported 1:1 from the original
 * GapAnalyzer.java / ReportGenerator.java / CompanyDatabase.java classes.
 *
 * Pure functions only — no DOM, no Node APIs — so this module runs
 * identically in the browser (live preview while a student edits sliders)
 * and on the server (the authoritative calculation an API route performs
 * before a report is persisted to Postgres).
 */

export interface CompanyRequirements {
  id?: string;
  name: string;
  description: string;
  java: number;
  python: number;
  sql: number;
  dsa: number;
  communication: number;
  projects: number;
  certifications: number;
}

export interface StudentInput {
  name: string;
  java: number;
  python: number;
  sql: number;
  dsa: number;
  communication: number;
  projects: number;
  certifications: number;
  extractedSkills?: string[];
}

export interface SkillDimension {
  key: string;
  label: string;
  student: number;
  required: number;
  count?: number;
  reqCount?: number;
}

export interface StrengthEntry {
  label: string;
  student: number;
  required: number;
}

export interface GapEntry {
  label: string;
  required: number;
  student: number;
  gap: number;
}

export interface Recommendation {
  tag: "JAVA" | "PYTHON" | "SQL" | "DSA" | "COMM" | "PROJECTS" | "CERTS" | "READY" | "LIVE JOBS";
  text: string;
  priority?: "Critical" | "Needs Improvement" | "Minor";
}

export interface RoadmapStep {
  month: number;
  text: string;
  tag: string | null;
  final?: boolean;
}

function getScoreRange(score: number): "0-20" | "21-40" | "41-60" | "61-75" | "76-90" | "91-100" {
  if (score <= 20) return "0-20";
  if (score <= 40) return "21-40";
  if (score <= 60) return "41-60";
  if (score <= 75) return "61-75";
  if (score <= 90) return "76-90";
  return "91-100";
}

export interface LiveJobInsights {
  jobsAnalyzed: number;
  matched: string[];
  criticalGaps: string[];
  needsImprovement: string[];
  optional: string[];
}

export interface AnalysisResult {
  dims: SkillDimension[];
  strengths: StrengthEntry[];
  missingSkills: string[];
  gapDetails: GapEntry[];
  readinessScore: number;
  status: string;
  statusEmoji: string;
  recommendations: Recommendation[];
  roadmap: RoadmapStep[];
  liveJobInsights?: LiveJobInsights;
}

/** Default benchmark data, identical to the original CompanyDatabase.java. */
export const DEFAULT_COMPANIES: CompanyRequirements[] = [
  { name: "Google", java: 8, python: 8, sql: 7, dsa: 10, communication: 8, projects: 4, certifications: 3, description: "Google demands exceptional problem-solving and DSA mastery. Coding interviews are intense." },
  { name: "Amazon", java: 8, python: 7, sql: 7, dsa: 9, communication: 8, projects: 3, certifications: 2, description: "Amazon focuses on leadership principles, DSA, and scalable system design." },
  { name: "Microsoft", java: 8, python: 7, sql: 7, dsa: 9, communication: 8, projects: 3, certifications: 2, description: "Microsoft values strong software engineering fundamentals and collaborative skills." },
  { name: "Goldman Sachs", java: 9, python: 7, sql: 9, dsa: 8, communication: 9, projects: 3, certifications: 3, description: "Goldman Sachs emphasizes financial programming, SQL, and professional communication." },
  { name: "Zoho", java: 9, python: 8, sql: 7, dsa: 7, communication: 7, projects: 4, certifications: 2, description: "Zoho values deep coding skills and practical product development experience." },
  { name: "TCS", java: 6, python: 6, sql: 6, dsa: 6, communication: 7, projects: 2, certifications: 2, description: "TCS looks for good all-round skills, certifications, and communication ability." },
  { name: "Infosys", java: 6, python: 5, sql: 6, dsa: 5, communication: 7, projects: 2, certifications: 2, description: "Infosys values communication skills and solid foundational technical knowledge." },
  { name: "Wipro", java: 6, python: 5, sql: 6, dsa: 5, communication: 7, projects: 2, certifications: 3, description: "Wipro emphasizes certifications, teamwork, and foundational IT skills." },
  { name: "Deloitte", java: 6, python: 7, sql: 8, dsa: 6, communication: 9, projects: 3, certifications: 3, description: "Deloitte prioritizes SQL/analytics, strong communication, and consulting aptitude." },
  { name: "Accenture", java: 6, python: 6, sql: 7, dsa: 6, communication: 8, projects: 2, certifications: 3, description: "Accenture looks for versatile skills, industry certifications, and client-facing ability." },
];

function clampSkill(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}
function clampCount(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(50, Math.round(n)));
}

/** Normalizes raw form input into safe integers before any calculation runs. */
export function sanitizeStudentInput(input: Partial<StudentInput>): StudentInput {
  return {
    name: (input.name ?? "").toString().trim().slice(0, 120),
    java: clampSkill(Number(input.java)),
    python: clampSkill(Number(input.python)),
    sql: clampSkill(Number(input.sql)),
    dsa: clampSkill(Number(input.dsa)),
    communication: clampSkill(Number(input.communication)),
    projects: clampCount(Number(input.projects)),
    certifications: clampCount(Number(input.certifications)),
    extractedSkills: Array.isArray(input.extractedSkills) ? input.extractedSkills.map(String) : [],
  };
}

/** Core analysis — mirrors GapAnalyzer.analyze(StudentProfile). */
export function analyze(
  student: StudentInput,
  company: CompanyRequirements,
  liveJobData?: { jobsAnalyzed: number; requiredSkills: { name: string; percentage: number }[] }
): AnalysisResult {
  const req = company;

  // 1. Unify student skills into a normalized map (0-10 scale)
  const studentSkillLevels = new Map<string, number>();
  studentSkillLevels.set("Java", student.java);
  studentSkillLevels.set("Python", student.python);
  studentSkillLevels.set("SQL", student.sql);
  studentSkillLevels.set("DSA", student.dsa);
  studentSkillLevels.set("Communication", student.communication);

  // Resume-detected dynamic skills
  if (student.extractedSkills) {
    for (const skill of student.extractedSkills) {
      // Map 'data structures & algorithms' to DSA
      const normSkill = skill.toLowerCase() === "data structures & algorithms" ? "DSA" : skill;
      
      // Do NOT overwrite core skills (Java, Python, SQL, DSA, Communication) since they are controlled by explicit UI sliders which the user may have deliberately set lower.
      const isCore = ["Java", "Python", "SQL", "DSA", "Communication"].includes(normSkill);
      
      if (!isCore) {
        // For dynamic skills without a slider, assume a baseline of 6/10 (Competent) rather than 8/10 (Advanced) to prevent unrealistic score inflation.
        const existing = studentSkillLevels.get(normSkill) || 0;
        studentSkillLevels.set(normSkill, Math.max(existing, 6));
      }
    }
  }

  const studentProjScore = Math.min(student.projects * 2, 10);
  const reqProjScore = Math.min(req.projects * 2, 10);
  const studentCertScore = Math.min(student.certifications * 2, 10);
  const reqCertScore = Math.min(req.certifications * 2, 10);

  let dims: SkillDimension[] = [];
  let readinessScore = 0;

  if (liveJobData) {
    // === LIVE JOBS MODE ===
    // Build dims dynamically from the top required skills + student's top skills
    const usedKeys = new Set<string>();

    for (const reqSkill of liveJobData.requiredSkills) {
      // Prioritize displaying skills with >= 15% demand
      if (reqSkill.percentage < 15 && dims.length >= 8) continue;
      
      const skillName = reqSkill.name;
      // Map names to match manual sliders where applicable
      let sLevel = studentSkillLevels.get(skillName) || 0;
      if (skillName.toLowerCase() === "data structures & algorithms") sLevel = Math.max(sLevel, studentSkillLevels.get("DSA") || 0);

      dims.push({
        key: skillName.toLowerCase(),
        label: skillName,
        student: sLevel,
        required: Math.round(reqSkill.percentage / 10),
      });
      usedKeys.add(skillName.toLowerCase());
      if (skillName.toLowerCase() === "data structures & algorithms") usedKeys.add("dsa");
    }

    // Add remaining manual student skills if they are strong (>5) to show what else they bring to the table
    for (const [sName, sVal] of studentSkillLevels.entries()) {
      if (!usedKeys.has(sName.toLowerCase()) && sVal >= 5) {
        dims.push({
          key: sName.toLowerCase(),
          label: sName,
          student: sVal,
          required: 0,
        });
        usedKeys.add(sName.toLowerCase());
      }
    }

    // Add projects/certs for full picture
    dims.push({ key: "proj", label: "Projects", student: studentProjScore, required: 0, count: student.projects, reqCount: req.projects });
    dims.push({ key: "cert", label: "Certifications", student: studentCertScore, required: 0, count: student.certifications, reqCount: req.certifications });

    // Dynamic Readiness Score Formula based on live demand:
    // We weight each required skill by its frequency percentage.
    let totalWeight = 0;
    let earned = 0;
    
    for (const reqSkill of liveJobData.requiredSkills) {
      // Only penalize/reward for meaningful signals (>15%)
      if (reqSkill.percentage >= 15) {
        const weight = reqSkill.percentage;
        let sLevel = studentSkillLevels.get(reqSkill.name) || 0;
        if (reqSkill.name.toLowerCase() === "data structures & algorithms") sLevel = Math.max(sLevel, studentSkillLevels.get("DSA") || 0);
        
        const reqLevel = Math.round(reqSkill.percentage / 10);
        const matchRatio = reqLevel > 0 ? Math.min(sLevel / reqLevel, 1) : 1;
        
        earned += matchRatio * weight;
        totalWeight += weight;
      }
    }

    // Blend in a baseline for general engineering prep (Projects & Comm) so it's not 100% just buzzword matching
    const baselineWeight = 40; 
    const baselineEarned = ((studentProjScore / 10) * 20) + ((studentSkillLevels.get("Communication") || 0) / 10 * 20);
    
    if (totalWeight === 0) {
      readinessScore = (baselineEarned / baselineWeight) * 100;
    } else {
      readinessScore = ((earned + baselineEarned) / (totalWeight + baselineWeight)) * 100;
    }

  } else {
    // === BENCHMARK MODE ===
    dims = [
      { key: "java", label: "Java", student: studentSkillLevels.get("Java") || 0, required: req.java },
      { key: "python", label: "Python", student: studentSkillLevels.get("Python") || 0, required: req.python },
      { key: "sql", label: "SQL", student: studentSkillLevels.get("SQL") || 0, required: req.sql },
      { key: "dsa", label: "DSA (Data Structures & Algorithms)", student: studentSkillLevels.get("DSA") || 0, required: req.dsa },
      { key: "comm", label: "Communication", student: studentSkillLevels.get("Communication") || 0, required: req.communication },
      { key: "proj", label: "Projects", student: studentProjScore, required: reqProjScore, count: student.projects, reqCount: req.projects },
      { key: "cert", label: "Certifications", student: studentCertScore, required: reqCertScore, count: student.certifications, reqCount: req.certifications }
    ];

    // Show top extra dynamic skills the student has, just for context
    for (const [sName, sVal] of studentSkillLevels.entries()) {
      if (!["Java", "Python", "SQL", "DSA", "Communication"].includes(sName) && sVal >= 7) {
        dims.push({ key: sName.toLowerCase(), label: sName, student: sVal, required: 0 });
      }
    }

    const raw =
      ((studentSkillLevels.get("Java") || 0) * 2.0) / Math.max(req.java, 1) +
      ((studentSkillLevels.get("Python") || 0) * 1.5) / Math.max(req.python, 1) +
      ((studentSkillLevels.get("SQL") || 0) * 1.5) / Math.max(req.sql, 1) +
      ((studentSkillLevels.get("DSA") || 0) * 2.0) / Math.max(req.dsa, 1) +
      ((studentSkillLevels.get("Communication") || 0) * 1.0) / Math.max(req.communication, 1) +
      (student.projects * 1.0) / Math.max(req.projects, 1) +
      (student.certifications * 1.0) / Math.max(req.certifications, 1);

    readinessScore = Math.min((raw / 10.0) * 100, 100);
  }

  readinessScore = Math.round(readinessScore * 10) / 10;

  const strengths: StrengthEntry[] = [];
  const missingSkills: string[] = [];
  const gapDetails: GapEntry[] = [];

  for (const d of dims) {
    if (d.required === 0) {
      strengths.push({ label: d.label, student: d.student, required: 0 });
    } else if (d.student >= d.required) {
      strengths.push({ label: d.label, student: d.student, required: d.required });
    } else {
      missingSkills.push(d.label);
      gapDetails.push({ label: d.label, required: d.required, student: d.student, gap: d.required - d.student });
    }
  }

  let status: string;
  let statusEmoji: string;
  if (readinessScore >= 85) {
    status = "Excellent — Highly Placement Ready";
    statusEmoji = "🌟";
  } else if (readinessScore >= 70) {
    status = "Good — Minor Improvements Needed";
    statusEmoji = "✅";
  } else if (readinessScore >= 50) {
    status = "Average — Needs More Preparation";
    statusEmoji = "⚠️";
  } else {
    status = "Beginner — Significant Improvement Required";
    statusEmoji = "🔴";
  }

  let liveJobInsights: LiveJobInsights | undefined = undefined;
  if (liveJobData) {
    const studentSkills = new Set([
      ...(student.extractedSkills || []).map(s => s.toLowerCase()),
      ...(student.java >= 5 ? ["java"] : []),
      ...(student.python >= 5 ? ["python"] : []),
      ...(student.sql >= 5 ? ["sql"] : []),
      ...(student.dsa >= 5 ? ["data structures & algorithms", "dsa"] : []),
      ...(student.communication >= 6 ? ["communication", "agile"] : [])
    ]);

    const matched: string[] = [];
    const criticalGaps: string[] = [];
    const needsImprovement: string[] = [];
    const optional: string[] = [];

    for (const reqSkill of liveJobData.requiredSkills) {
      const s = reqSkill.name.toLowerCase();
      if (studentSkills.has(s) || (s === "data structures & algorithms" && studentSkills.has("dsa"))) {
        matched.push(reqSkill.name);
      } else {
        if (reqSkill.percentage >= 40) {
          criticalGaps.push(reqSkill.name);
        } else if (reqSkill.percentage >= 20) {
          needsImprovement.push(reqSkill.name);
        } else {
          optional.push(reqSkill.name);
        }
      }
    }

    liveJobInsights = {
      jobsAnalyzed: liveJobData.jobsAnalyzed,
      matched,
      criticalGaps,
      needsImprovement,
      optional
    };
  }

  return {
    dims,
    strengths,
    missingSkills,
    gapDetails,
    readinessScore,
    status,
    statusEmoji,
    recommendations: buildRecommendations(student, req, readinessScore, liveJobInsights),
    roadmap: buildRoadmap(student, req, readinessScore, liveJobInsights),
    liveJobInsights,
  };
}

function buildRecommendations(p: StudentInput, req: CompanyRequirements, score: number, liveJobs?: LiveJobInsights): Recommendation[] {
  const out: Recommendation[] = [];
  const range = getScoreRange(score);

  if (liveJobs && liveJobs.criticalGaps.length > 0) {
    out.push({
      tag: "LIVE JOBS",
      text: `Based on ${liveJobs.jobsAnalyzed} live job postings, you are missing critical skills requested right now: ${liveJobs.criticalGaps.slice(0, 3).join(", ")}. Prioritize learning these immediately.`,
      priority: "Critical"
    });
  } else if (liveJobs && liveJobs.needsImprovement.length > 0) {
    out.push({
      tag: "LIVE JOBS",
      text: `Live postings indicate a frequent need for: ${liveJobs.needsImprovement.slice(0, 3).join(", ")}. Consider picking these up to stand out.`,
      priority: "Needs Improvement"
    });
  }

  const getPriority = (gap: number, required: number): "Critical" | "Needs Improvement" | "Minor" => {
    if (gap >= required * 0.5 || gap >= 4) return "Critical";
    if (gap >= 2) return "Needs Improvement";
    return "Minor";
  };

  if (p.dsa < req.dsa) {
    const gap = req.dsa - p.dsa;
    const priority = getPriority(gap, req.dsa);
    let text = "";
    if (range === "0-20" || range === "21-40") {
      text = p.dsa <= 3 ? "Begin with absolute basics: Arrays, Strings, and simple loops. Avoid complex algorithms until fundamentals are solid." : "Focus heavily on foundational data structures like Linked Lists, Stacks, and Queues before advancing.";
    } else if (range === "41-60") {
      text = priority === "Critical" ? `Your DSA is significantly lagging. Dedicated daily practice on standard problems (Trees, Recursion) is essential for ${req.name}.` : "You have the basics down. Tackle medium-difficulty problems consistently using a curated list like NeetCode 150.";
    } else if (range === "61-75") {
      text = "Focus on optimizing your solutions and pattern recognition. Practice Graphs, Dynamic Programming, and Greedy Algorithms.";
    } else if (range === "76-90") {
      text = `You are close to the bar for ${req.name}. Fine-tune your skills by participating in timed contests and solving their specifically asked hard problems.`;
    } else {
      text = "Your DSA is almost at the required level. Polish edge cases and review complex data structures like Segment Trees or Tries to confidently clear interviews.";
    }
    out.push({ tag: "DSA", text, priority });
  }

  if (p.java < req.java) {
    const gap = req.java - p.java;
    const priority = getPriority(gap, req.java);
    let text = "";
    if (range === "0-20" || range === "21-40") {
      text = p.java <= 3 ? "Start a structured Java course. Focus on syntax, variables, and basic object-oriented principles." : "Strengthen your core OOP concepts (Inheritance, Polymorphism) and get comfortable with the Collections framework.";
    } else if (range === "41-60") {
      text = priority === "Critical" ? "Java is a core requirement you are missing. Prioritize learning Exception Handling, Generics, and basic Multithreading." : "Practice implementing common design patterns and deepen your understanding of the Java Memory Model.";
    } else if (range === "61-75") {
      text = `Focus on advanced concepts required by ${req.name}, such as Java 8+ features (Streams, Lambdas) and Concurrency utilities.`;
    } else {
      text = "You only have a minor gap in Java. Build a small project or review JVM internals and garbage collection tuning.";
    }
    out.push({ tag: "JAVA", text, priority });
  }

  if (p.python < req.python) {
    const gap = req.python - p.python;
    const priority = getPriority(gap, req.python);
    let text = "";
    if (range === "0-20" || range === "21-40") {
      text = "Start with Python syntax, lists, dictionaries, and basic scripting. Get comfortable writing simple automation scripts.";
    } else if (range === "41-60") {
      text = "Move beyond basics. Learn Pythonic idioms (list comprehensions, generators) and start using virtual environments.";
    } else {
      text = `Deepen your knowledge of Python frameworks (like Django or FastAPI) and practice writing production-grade, PEP 8 compliant code for ${req.name}.`;
    }
    out.push({ tag: "PYTHON", text, priority });
  }

  if (p.sql < req.sql) {
    const gap = req.sql - p.sql;
    const priority = getPriority(gap, req.sql);
    let text = "";
    if (range === "0-20" || range === "21-40") {
      text = "Focus on basic CRUD operations and understanding how relational databases work. Practice simple SELECTs, INSERTs, and WHERE clauses.";
    } else if (range === "41-60") {
      text = "Master JOINs (Inner, Left, Right), GROUP BY, and aggregate functions. These are essential for any data-driven role.";
    } else if (range === "61-75") {
      text = "Practice complex queries involving subqueries, CTEs, and Window Functions. Understand indexing basics.";
    } else {
      text = `You are very close to ${req.name}'s requirement. Review query execution plans, normalization, and transaction isolation levels.`;
    }
    out.push({ tag: "SQL", text, priority });
  }

  if (p.communication < req.communication) {
    const gap = req.communication - p.communication;
    const priority = getPriority(gap, req.communication);
    let text = "";
    if (priority === "Critical" || range === "0-20" || range === "21-40") {
      text = "Start practicing speaking your thoughts out loud while coding. Join a speaking club or study group to build confidence.";
    } else if (range === "41-60" || range === "61-75") {
      text = `Conduct regular mock interviews with peers. Focus on structuring your answers using the STAR method, as ${req.name} values clear communication.`;
    } else {
      text = "Refine your executive presence. Practice explaining complex technical trade-offs concisely to both technical and non-technical stakeholders.";
    }
    out.push({ tag: "COMM", text, priority });
  }

  if (p.projects < req.projects) {
    const missing = req.projects - p.projects;
    const priority = getPriority(missing, req.projects);
    let text = "";
    if (range === "0-20" || range === "21-40") {
      text = `You need ${missing} more project(s). Start with simple, guided tutorials to build your confidence before attempting custom applications.`;
    } else if (range === "41-60" || range === "61-75") {
      text = `Build ${missing} more original project(s). Move away from tutorials and solve a real-world problem. Host it on GitHub with a solid README.`;
    } else {
      text = `You are short by ${missing} project(s) for ${req.name}. Contribute to an open-source repository or build a full-stack app deployed on AWS/Vercel.`;
    }
    out.push({ tag: "PROJECTS", text, priority });
  }

  if (p.certifications < req.certifications) {
    const missing = req.certifications - p.certifications;
    const priority = getPriority(missing, req.certifications);
    let text = "";
    if (range === "0-20" || range === "41-60" || range === "21-40") {
      text = `Plan to earn ${missing} more certification(s). Look into foundational certs like AWS Cloud Practitioner or Azure Fundamentals.`;
    } else {
      text = `Earn ${missing} more industry-recognized certification(s) to stand out for ${req.name} (e.g., AWS Solutions Architect or Oracle Certified Professional).`;
    }
    out.push({ tag: "CERTS", text, priority });
  }

  if (out.length === 0) {
    out.push({ tag: "READY", text: `You meet or exceed every requirement for ${req.name}! Focus on mock interviews and networking.`, priority: undefined });
  }

  out.sort((a, b) => {
    const val = { "Critical": 3, "Needs Improvement": 2, "Minor": 1 };
    return (val[b.priority as keyof typeof val] || 0) - (val[a.priority as keyof typeof val] || 0);
  });

  return out;
}

interface Priority {
  key: "dsa" | "java" | "python" | "sql" | "comm" | "proj" | "cert";
  label: string;
  gap: number;
}

function roadmapAction(entry: Priority, range: string, p: StudentInput, req: CompanyRequirements): string {
  switch (entry.key) {
    case "dsa":
      if (range === "0-20" || range === "21-40") return "Master programming basics and simple data structures (Arrays, Strings) from scratch.";
      if (range === "41-60") return "Advance to standard interview data structures — Trees, Linked Lists, Stacks, and Queues.";
      return "Focus on advanced algorithms — Dynamic Programming, Graphs, and company-specific hard problems.";
    case "java":
      if (range === "0-20" || range === "21-40") return "Learn Java syntax, variables, loops, and basic OOP principles.";
      if (range === "41-60") return "Deepen Java OOP concepts, Collections framework, and Exception handling.";
      return "Master Java multithreading, Streams API, and JVM internals.";
    case "python":
      if (range === "0-20" || range === "21-40") return "Learn basic Python scripting, lists, and dictionaries.";
      if (range === "41-60") return "Practice OOP in Python, list comprehensions, and using libraries.";
      return "Build production-ready Python applications and learn framework internals.";
    case "sql":
      if (range === "0-20" || range === "21-40") return "Understand relational databases and practice basic CRUD SQL queries.";
      if (range === "41-60") return "Master SQL Joins, GROUP BY, and aggregate functions.";
      return "Practice advanced SQL: Window functions, CTEs, and query optimization.";
    case "comm":
      if (range === "0-20" || range === "21-40") return "Join a speaking club or start speaking your thoughts out loud while coding.";
      return "Schedule regular mock interviews and practice the STAR method for behavioral questions.";
    case "proj":
      if (range === "0-20" || range === "21-40") return "Follow guided tutorials to build your first simple project.";
      return "Build an independent portfolio project (full-stack or domain-specific) and host it on GitHub.";
    case "cert":
      return `Study for and earn ${req.certifications - p.certifications} industry certification(s).`;
    default:
      return `Work on ${entry.label}`;
  }
}

function buildRoadmap(p: StudentInput, req: CompanyRequirements, score: number, liveJobs?: LiveJobInsights): RoadmapStep[] {
  const range = getScoreRange(score);
  const priorities: Priority[] = [];
  const add = (key: Priority["key"], label: string, gap: number) => {
    if (gap > 0) priorities.push({ key, label, gap });
  };
  add("dsa", "DSA", req.dsa - p.dsa);
  add("java", "Java", req.java - p.java);
  add("python", "Python", req.python - p.python);
  add("sql", "SQL", req.sql - p.sql);
  add("comm", "Communication", req.communication - p.communication);
  add("proj", "Projects", req.projects - p.projects);
  add("cert", "Certifications", req.certifications - p.certifications);

  // Stable sort, descending by gap size — mirrors GapAnalyzer's priority ordering.
  const ordered = priorities
    .map((v, i) => ({ ...v, _i: i }))
    .sort((a, b) => b.gap - a.gap || a._i - b._i);

  const roadmap: RoadmapStep[] = [];

  if (ordered.length === 0) {
    roadmap.push({ month: 1, text: "Revise core concepts and take timed mock tests.", tag: null });
    roadmap.push({ month: 2, text: "Apply for internships / off-campus drives.", tag: null });
    roadmap.push({ month: 3, text: "Mock interviews (technical + HR) with a peer or platform.", tag: null, final: true });
    roadmap.push({ month: 4, text: `Network on LinkedIn; target referrals at ${req.name}.`, tag: null, final: true });
    return roadmap;
  }

  let month = 1;
  if (range === "0-20" || range === "21-40") {
    roadmap.push({ month, text: "Establish a daily learning routine. Focus entirely on basics before rushing to advanced topics.", tag: null });
    month++;
  } else if (range === "41-60") {
    roadmap.push({ month, text: "Identify and systematically eliminate your weakest knowledge areas through targeted practice.", tag: null });
    month++;
  }

  for (const entry of ordered) {
    roadmap.push({ month, text: roadmapAction(entry, range, p, req), tag: entry.label });
    month++;
    if (month > (range === "0-20" || range === "21-40" ? 5 : 6)) break;
  }
  
  if (liveJobs && liveJobs.criticalGaps.length > 0) {
    roadmap.push({ month, text: `Pick up ${liveJobs.criticalGaps[0]} and ${liveJobs.criticalGaps[1] || liveJobs.criticalGaps[0]} (live job required skills).`, tag: "LIVE JOBS" });
    month++;
  }

  roadmap.push({ month, text: "Full mock interview preparation (technical + behavioural rounds).", tag: null, final: true });
  roadmap.push({ month: month + 1, text: `Apply, network on LinkedIn, and target referrals at ${req.name}.`, tag: null, final: true });
  return roadmap;
}

// ── Report text (ported 1:1 from ReportGenerator.java) ────────────────────

function pad(str: string | number, len: number): string {
  const s = String(str);
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}
function centre(text: string, width: number): string {
  const p = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(p) + text;
}

export function generateReportText(student: StudentInput, req: CompanyRequirements, result: AnalysisResult, generatedAt: Date = new Date()): string {
  const LINE = "=".repeat(62);
  const DLINE = "-".repeat(62);
  const lines: string[] = [];

  lines.push(LINE);
  lines.push(centre("SKILL GAP ANALYSIS REPORT", 62));
  lines.push(centre("Skill Gap Analyzer — Dream Company Readiness", 62));
  lines.push(LINE, "");
  lines.push("  Student Name  : " + (student.name || "—"));
  lines.push("  Dream Company : " + req.name);
  lines.push("  Generated At  : " + generatedAt.toLocaleString());
  if (student.extractedSkills && student.extractedSkills.length > 0) {
    lines.push("  Resume Skills : " + student.extractedSkills.join(", "));
  }
  lines.push("");
  lines.push(DLINE);
  lines.push("  COMPANY PROFILE");
  lines.push(DLINE);
  lines.push("  " + req.description);
  lines.push("");
  lines.push(DLINE);
  lines.push("  READINESS SCORE");
  lines.push(DLINE);
  lines.push("  " + result.statusEmoji + "  " + result.readinessScore.toFixed(1) + "%  —  " + result.status);
  lines.push("");
  lines.push(DLINE);
  lines.push("  SKILL COMPARISON TABLE");
  lines.push(DLINE);
  lines.push("  " + pad("Skill", 32) + "  " + pad("Required", 8) + "  " + pad("Yours", 8));
  lines.push("  " + "·".repeat(58));
  for (const d of result.dims) {
    const status = d.student >= d.required ? "OK" : "GAP";
    lines.push("  " + pad(d.label, 32) + "  " + pad(d.required, 8) + "  " + pad(d.student, 8) + "  " + status);
  }
  lines.push("");
  lines.push(DLINE);
  lines.push("  STRENGTHS");
  lines.push(DLINE);
  if (result.strengths.length === 0) lines.push("  No skills meet company requirements yet — keep going!");
  else for (const s of result.strengths) lines.push(`  * ${s.label} (${s.student}/${s.required} required)`);
  lines.push("");
  lines.push(DLINE);
  lines.push("  SKILLS REQUIRING IMPROVEMENT");
  lines.push(DLINE);
  if (result.missingSkills.length === 0) lines.push("  None — you meet all skill requirements!");
  else for (const m of result.missingSkills) lines.push("  * " + m);
  lines.push("");
  lines.push(DLINE);
  lines.push("  SKILL GAP DETAILS");
  lines.push(DLINE);
  if (result.gapDetails.length === 0) lines.push("  No gaps found — excellent profile!");
  else for (const g of result.gapDetails) lines.push(`  ${pad(g.label, 35)} Required: ${pad(g.required, 4)}  Current: ${pad(g.student, 4)}  Gap: ${g.gap}`);
  lines.push("");
  lines.push(DLINE);
  lines.push("  PERSONALISED RECOMMENDATIONS");
  lines.push(DLINE);
  for (const r of result.recommendations) {
    const prioStr = r.priority ? ` [${r.priority}]` : "";
    lines.push(`  [${r.tag}]${prioStr} ${r.text}`);
  }
  lines.push("");
  lines.push(DLINE);
  lines.push("  LEARNING ROADMAP");
  lines.push(DLINE);
  for (const r of result.roadmap) lines.push(`  Month ${r.month}: ${r.text}`);
  lines.push("");
  lines.push(LINE);
  lines.push(centre("Good luck" + (student.name ? ", " + student.name : "") + "!", 62));
  lines.push(centre("Skill Gap Analyzer | Your Career, Mapped.", 62));
  lines.push(LINE);

  return lines.join("\n");
}
