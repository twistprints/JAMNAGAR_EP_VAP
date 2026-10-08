import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVehicleBackupZip } from "@/lib/storage";
import { recordAuditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const submission = await prisma.submission.findUnique({
      where: { id: params.id },
      include: {
        documents: true,
        extractions: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const zipBuffer = await createVehicleBackupZip({
      submissionNo: submission.submissionNo,
      normalizedVehicleNo: submission.normalizedVehicleNo,
      vehicleNumber: submission.vehicleNumber,
      vehicleType: submission.vehicleType,
      driverName: submission.driverName,
      companyName: submission.companyName,
      createdAt: submission.createdAt,
      documents: submission.documents.map((d: any) => ({
        category: d.category,
        filePath: d.filePath,
        fileName: d.fileName,
      })),
      extractions: submission.extractions.map((e: any) => ({
        category: e.category,
        extractedFields: e.extractedFields,
        confidenceScore: e.confidenceScore,
      })),
    });

    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      action: "DOWNLOAD_BACKUP_ZIP",
      resourceType: "SUBMISSION",
      resourceId: submission.id,
      details: { vehicleNumber: submission.vehicleNumber },
    });

    const filename = `${submission.normalizedVehicleNo}_DOCUMENTS.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Failed to generate backup zip." }, { status: 500 });
  }
}
