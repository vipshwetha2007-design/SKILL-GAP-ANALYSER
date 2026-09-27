import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { extractSkills } from "@/lib/skill-parser";

// We need to parse multipart/form-data. In Next.js App Router, we can use req.formData()
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text = "";

    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
      file.name.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type. Please upload a PDF or DOCX." }, { status: 400 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "Could not extract text from the file." }, { status: 400 });
    }

    const extracted = extractSkills(text);

    return NextResponse.json({ skills: extracted });
  } catch (err: any) {
    console.error("Extraction error:", err);
    return NextResponse.json({ error: "Failed to process resume: " + err.message }, { status: 500 });
  }
}
