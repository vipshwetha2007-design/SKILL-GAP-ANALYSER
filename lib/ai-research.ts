/**
 * Optional AI-research source for the benchmark-freshness system.
 *
 * Nothing here runs unless `ANTHROPIC_API_KEY` is set — by design, per the
 * project's "key-free for now" setup. When the key is missing,
 * `researchCompanyBenchmark` throws `AiResearchNotConfiguredError`, and the
 * calling API route turns that into a clear, non-crashing response so the
 * admin UI can say "add a key to enable this" instead of failing.
 *
 * When a key *is* set, this asks Claude to reason about a company's current
 * hiring bar from its own knowledge and returns a structured, cited
 * suggestion — never applied directly. It always lands in the
 * `BenchmarkSuggestion` review queue, same as a crowdsourced or manual
 * proposal, so an admin has to approve it before it touches live scoring.
 */
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { CompanyRequirements } from "./scoring";

export class AiResearchNotConfiguredError extends Error {
  constructor() {
    super("AI research isn't configured yet — set ANTHROPIC_API_KEY to enable it.");
    this.name = "AiResearchNotConfiguredError";
  }
}

const researchSchema = z.object({
  java: z.number().int().min(0).max(10).nullable().optional(),
  python: z.number().int().min(0).max(10).nullable().optional(),
  sql: z.number().int().min(0).max(10).nullable().optional(),
  dsa: z.number().int().min(0).max(10).nullable().optional(),
  communication: z.number().int().min(0).max(10).nullable().optional(),
  projects: z.number().int().min(0).max(50).nullable().optional(),
  certifications: z.number().int().min(0).max(50).nullable().optional(),
  rationale: z.string().min(1),
  citationUrl: z.string().url().nullable().optional(),
});

export type ResearchedBenchmark = z.infer<typeof researchSchema>;

type CurrentRequirements = Pick<
  CompanyRequirements,
  "java" | "python" | "sql" | "dsa" | "communication" | "projects" | "certifications"
>;

const SYSTEM_PROMPT = `You help keep a student placement-readiness tool's company benchmarks current.
Given a company name and its current 0-10 skill bars (0-50 for projects/certifications), suggest
updated numbers that reflect that company's *current, real-world* technical hiring bar for
new-graduate / early-career software roles — based on what you know of their interview process,
publicly discussed interview experiences, and job postings.

Rules:
- Only change a field if you have a genuine, defensible reason to think the current number is off.
  Leave a field null if you'd just be guessing or the current value already looks right.
- Never invent a specific URL. Only set citationUrl if you can name a real, well-known, stable
  page (e.g. a company's official careers/engineering-blog domain) that plausibly discusses this;
  otherwise leave it null — a fabricated citation is worse than none.
- rationale must be a short, plain-language explanation a non-technical admin can read before
  approving or rejecting this suggestion.
- Respond with ONLY a JSON object matching this shape, no prose outside it:
  {"java": number|null, "python": number|null, "sql": number|null, "dsa": number|null,
   "communication": number|null, "projects": number|null, "certifications": number|null,
   "rationale": string, "citationUrl": string|null}`;

function buildPrompt(companyName: string, current: CurrentRequirements): string {
  return `Company: ${companyName}

Current benchmark (scale 0-10, except projects/certifications which are raw counts):
- Java: ${current.java}
- Python: ${current.python}
- SQL: ${current.sql}
- DSA: ${current.dsa}
- Communication: ${current.communication}
- Projects expected: ${current.projects}
- Certifications expected: ${current.certifications}

Suggest updated numbers reflecting ${companyName}'s current hiring bar, following the rules in your instructions.`;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("AI response didn't contain a JSON object.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Asks Claude for an updated benchmark for `companyName`. Throws
 * `AiResearchNotConfiguredError` if no API key is set — callers should catch
 * that specifically and report "not configured" rather than a generic 500.
 */
export async function researchCompanyBenchmark(
  companyName: string,
  current: CurrentRequirements
): Promise<ResearchedBenchmark> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiResearchNotConfiguredError();

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(companyName, current) }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI response contained no text.");
  }

  const parsed = researchSchema.safeParse(extractJson(textBlock.text));
  if (!parsed.success) {
    throw new Error("AI response didn't match the expected shape: " + parsed.error.message);
  }
  return parsed.data;
}
