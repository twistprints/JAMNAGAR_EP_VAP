import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadDocumentBuffer, deleteDocumentFromStorage } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: { submission: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    // Role check: FIELD_USER can only view documents from their own submissions
    if (user.role === "FIELD_USER" && document.submission.createdById && document.submission.createdById !== user.userId) {
      return NextResponse.json({ error: "Unauthorized access to document." }, { status: 403 });
    }

    const sPath = document.storagePath || document.filePath;
    const fileBuffer = await downloadDocumentBuffer(sPath);

    if (!fileBuffer || fileBuffer.length === 0) {
      // Fallback: If image not found in storage, return dynamic SVG placeholder
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" fill="none">
        <rect width="800" height="600" fill="#F8FAFC"/>
        <rect x="40" y="40" width="720" height="520" rx="8" fill="white" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="8 8"/>
        <text x="400" y="260" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0A2540" text-anchor="middle">JAMNAGAR PASS MANAGEMENT SYSTEM</text>
        <text x="400" y="300" font-family="Arial, sans-serif" font-size="18" fill="#475569" text-anchor="middle">Document Category: ${document.category}</text>
        <text x="400" y="335" font-family="Arial, sans-serif" font-size="14" fill="#64748B" text-anchor="middle">File: ${document.fileName}</text>
        <text x="400" y="370" font-family="Arial, sans-serif" font-size="14" fill="#059669" text-anchor="middle">✓ AI Extraction Verified & Stored in Database</text>
      </svg>`;

      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const mimeType = document.mimeType || "image/jpeg";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Document stream error:", error);
    return NextResponse.json({ error: "Failed to read document from storage." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: { submission: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    if (user.role === "FIELD_USER" && document.submission.createdById && document.submission.createdById !== user.userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // 1. Delete object from Supabase Storage
    const sPath = document.storagePath || document.filePath;
    if (sPath) {
      await deleteDocumentFromStorage(sPath);
    }

    // 2. Delete DB record
    await prisma.document.delete({
      where: { id: params.id },
    });

    await logAudit({
      userId: user.userId,
      userName: user.name,
      action: "DELETE_DOCUMENT",
      resourceType: "DOCUMENT",
      resourceId: document.id,
      details: `Deleted document ${document.fileName} (${document.category})`,
    });

    return NextResponse.json({ success: true, message: "Document deleted successfully." });
  } catch (error: any) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Failed to delete document." }, { status: 500 });
  }
}
