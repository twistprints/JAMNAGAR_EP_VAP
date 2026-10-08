import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractDocumentData } from "@/lib/gemini";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const { documentId, submissionId, category } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required." }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { documents: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    let docsToProcess = submission.documents;
    if (documentId) {
      docsToProcess = docsToProcess.filter((d: { id: string }) => d.id === documentId);
    } else if (category) {
      docsToProcess = docsToProcess.filter((d: { category: string }) => d.category.toUpperCase() === category.toUpperCase());
    }

    const results = [];

    for (const doc of docsToProcess) {
      const fullPath = path.resolve(process.cwd(), doc.filePath);
      const res = await extractDocumentData(fullPath, doc.category, submission.vehicleNumber);

      const extraction = await prisma.documentExtraction.create({
        data: {
          submissionId: submission.id,
          documentId: doc.id,
          category: doc.category,
          rawAiResponse: JSON.stringify(res),
          extractedFields: JSON.stringify(res.fields),
          confidenceScore: res.source === "GEMINI_VISION" ? 0.95 : 0.0,
          warnings: JSON.stringify(res.warnings),
          status: res.source === "GEMINI_VISION" ? "SUCCESS" : "UNAVAILABLE",
        },
      });

      results.push({
        documentId: doc.id,
        category: doc.category,
        result: res,
        source: res.source,
        model: res.model,
        warnings: res.warnings,
        extractionId: extraction.id,
      });
    }

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error: any) {
    console.error("Extract error:", error);
    return NextResponse.json({ error: "Failed to run extraction." }, { status: 500 });
  }
}
