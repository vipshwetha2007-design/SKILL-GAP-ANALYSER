import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { extractSkills } from "@/lib/skill-parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    // PDF
    if (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    ) {
      try {
        const data = await pdfParse(buffer);
        text = data.text;
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);

        return NextResponse.json(
          {
            error:
              "Unable to read this PDF. Please re-save it using Print > Save as PDF, or upload a DOCX file.",
          },
          { status: 422 }
        );
      }
    }

    // DOCX
    else if (
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx")
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } catch (docxError) {
        console.error("DOCX parsing error:", docxError);

        return NextResponse.json(
          { error: "Unable to read this DOCX file." },
          { status: 422 }
        );
      }
    }

    // Unsupported file
    else {
      return NextResponse.json(
        {
          error: "Unsupported file type. Please upload a PDF or DOCX.",
        },
        { status: 400 }
      );
    }

    // No text extracted
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Could not extract text from the file.",
        },
        { status: 422 }
      );
    }

    // Extract skills
    const extracted = extractSkills(text);

    return NextResponse.json({
      skills: extracted,
    });
  } catch (err: any) {
    console.error("Extraction error:", err);

    return NextResponse.json(
      {
        error: "Failed to process resume: " + (err?.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}