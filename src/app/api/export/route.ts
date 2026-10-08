import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAdminResponse, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import {
  getValidatedExportData,
  generateEPPhotosZip,
  generateAllBatchesPhotosZip,
  generateFullExportZip,
  generateVehicleBackupArchive,
} from "@/lib/exportService";
import {
  generateMasterEPExcel,
  generateMasterVAPExcel,
  generateMasterRegisterExcel,
} from "@/lib/excel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();
    if (user.role !== "ADMIN") return requireAdminResponse();

    const body = await req.json().catch(() => ({}));
    const {
      exportType = "ALL", // "EP" | "VAP" | "PHOTOS" | "BATCH" | "MASTER_REGISTER" | "ALL" | "VEHICLE_BACKUP"
      batchId,
      status,
      filter = "ALL",
      startDate,
      endDate,
      selectedIds,
      vehicleNumber,
    } = body;

    const dateStr = new Date().toISOString().split("T")[0];

    // Handle Vehicle Backup Archive specifically
    if (exportType === "VEHICLE_BACKUP") {
      if (!vehicleNumber) {
        return NextResponse.json({ error: "Vehicle number is required for vehicle backup." }, { status: 400 });
      }
      const vehZipBuffer = await generateVehicleBackupArchive(vehicleNumber);
      const cleanVeh = vehicleNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const fileName = `${cleanVeh}_BACKUP_${dateStr}.zip`;

      try {
        await logAudit({
          userId: user.userId,
          userName: user.name,
          action: "DOWNLOAD_VEHICLE_BACKUP",
          resourceType: "EXPORT",
          resourceId: cleanVeh,
          details: `Downloaded vehicle document backup archive for ${cleanVeh}`,
        });
      } catch (auditErr) {
        console.error("Audit logging notice:", auditErr);
      }

      return new NextResponse(new Uint8Array(vehZipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": vehZipBuffer.length.toString(),
        },
      });
    }

    // Get Batch Information if batchId provided
    let batchObj: any = null;
    if (batchId && batchId !== "ALL") {
      batchObj = await prisma.batch.findUnique({ where: { id: batchId } });
    }

    const batchNumber = batchObj ? batchObj.batchNumber : null;

    // Fetch validated export data
    const validation = await getValidatedExportData({
      batchId: batchId !== "ALL" ? batchId : undefined,
      status: exportType === "MASTER_REGISTER" ? status : "APPROVED",
      onlyApproved: exportType !== "MASTER_REGISTER",
      filter,
      startDate,
      endDate,
      selectedIds,
    });

    if (validation.records.length === 0) {
      return NextResponse.json(
        { error: "No records found matching the requested export criteria." },
        { status: 400 }
      );
    }

    let fileBuffer: Buffer;
    let fileName = "";
    let mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (exportType === "EP") {
      fileBuffer = await generateMasterEPExcel(validation.records);
      fileName = batchNumber ? `${batchNumber}_EP_${dateStr}.xlsx` : `JAMNAGAR_ALL_EP_${dateStr}.xlsx`;
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (exportType === "VAP") {
      fileBuffer = await generateMasterVAPExcel(validation.records);
      fileName = batchNumber ? `${batchNumber}_VAP_${dateStr}.xlsx` : `JAMNAGAR_ALL_VAP_${dateStr}.xlsx`;
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (exportType === "PHOTOS") {
      if (batchNumber) {
        fileBuffer = await generateEPPhotosZip(validation.records, batchNumber);
        fileName = `${batchNumber}_PHOTOS_${dateStr}.zip`;
      } else {
        fileBuffer = await generateAllBatchesPhotosZip(validation.records);
        fileName = `JAMNAGAR_ALL_PHOTOS_${dateStr}.zip`;
      }
      mimeType = "application/zip";
    } else if (exportType === "MASTER_REGISTER") {
      fileBuffer = await generateMasterRegisterExcel(validation.records);
      fileName = `JAMNAGAR_MASTER_REGISTER_${dateStr}.xlsx`;
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else if (exportType === "BATCH") {
      const fullRes = await generateFullExportZip(batchId, batchNumber || "BATCH_001");
      fileBuffer = fullRes.buffer;
      fileName = fullRes.fileName;
      mimeType = "application/zip";
    } else {
      // "ALL" -> Global complete export bundle
      const fullRes = await generateFullExportZip(undefined, undefined);
      fileBuffer = fullRes.buffer;
      fileName = `JAMNAGAR_EXPORT_${dateStr}.zip`;
      mimeType = "application/zip";
    }

    // Save Export Batch record
    try {
      const exportRecord = await prisma.exportBatch.create({
        data: {
          exportType,
          dateFilter: batchNumber || filter,
          recordCount: validation.records.length,
          fileName,
          createdById: user.userId,
        },
      });

      // Mark exported timestamp on records
      await prisma.submission.updateMany({
        where: { id: { in: validation.records.map((r) => r.submissionId) } },
        data: { exportedAt: new Date() },
      });

      // Create Audit Log
      const actionMap: Record<string, string> = {
        EP: "EXPORT_EP",
        VAP: "EXPORT_VAP",
        PHOTOS: "DOWNLOAD_PHOTOS",
        BATCH: "EXPORT_BATCH",
        MASTER_REGISTER: "EXPORT_MASTER_REGISTER",
        ALL: "EXPORT_ALL",
      };

      await logAudit({
        userId: user.userId,
        userName: user.name,
        action: actionMap[exportType] || "EXPORT_DATA",
        resourceType: "EXPORT",
        resourceId: exportRecord.id,
        details: `Generated ${exportType} export (${fileName}) containing ${validation.records.length} records.`,
      });
    } catch (dbErr) {
      console.error("Export audit logging notice:", dbErr);
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate export." },
      { status: 500 }
    );
  }
}
