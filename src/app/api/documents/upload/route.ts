import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, requireAuthResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveDocumentFile } from "@/lib/storage";
import { extractDocumentData } from "@/lib/gemini";
import { recordAuditLog } from "@/lib/audit";
import { reconcileSubmissionData } from "@/lib/reconciliation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user) return requireAuthResponse();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const submissionId = formData.get("submissionId") as string | null;
    const category = (formData.get("category") as string | null) || "OTHER";
    const pageNumber = parseInt((formData.get("pageNumber") as string) || "1", 10);

    if (!file || !submissionId) {
      return NextResponse.json(
        { error: "File and submissionId are required." },
        { status: 400 }
      );
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { extractions: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const dateStr = submission.createdAt.toISOString();
    const { relativePath, fullPath, fileName } = await saveDocumentFile(
      buffer,
      dateStr,
      submission.normalizedVehicleNo,
      category,
      file.name
    );

    // Save document in DB
    const document = await prisma.document.create({
      data: {
        submissionId: submission.id,
        category: category.toUpperCase(),
        filePath: relativePath,
        fileName: fileName,
        fileSize: buffer.length,
        mimeType: file.type || "image/jpeg",
        pageNumber,
      },
    });

    // Run AI Document Extraction Pipeline
    let extractionResult = null;
    try {
      extractionResult = await extractDocumentData(
        fullPath,
        category,
        submission.vehicleNumber
      );

      // Upsert DocumentExtraction record
      const extraction = await prisma.documentExtraction.create({
        data: {
          submissionId: submission.id,
          documentId: document.id,
          category: category.toUpperCase(),
          rawAiResponse: JSON.stringify(extractionResult.fields),
          extractedFields: JSON.stringify(extractionResult.fields),
          confidenceScore: extractionResult.source === "GEMINI_VISION" ? 0.95 : 0.0,
          warnings: JSON.stringify(extractionResult.warnings),
          status: extractionResult.source === "GEMINI_VISION" ? "SUCCESS" : "ERROR",
        },
      });

      // Update submission snapshot fields if found from primary document
      const updateData: any = {};
      const f = extractionResult.fields;

      if (category.toUpperCase() === "RC") {
        if (f.owner_name?.value) updateData.rcOwnerName = f.owner_name.value;
        if (f.chassis_number?.value) updateData.chassisNumber = f.chassis_number.value;
        if (f.engine_number?.value) updateData.engineNumber = f.engine_number.value;
      } else if (category.toUpperCase() === "AADHAAR") {
        if (f.aadhaar_number?.value) updateData.aadhaarNumber = f.aadhaar_number.value;
      } else if (category.toUpperCase() === "DRIVING_LICENSE") {
        if (f.license_number?.value) updateData.licenseNumber = f.license_number.value;
        if (f.valid_to?.value || f.transport_valid_to?.value) {
          updateData.licenseValidTo = f.valid_to?.value || f.transport_valid_to?.value;
        }
      } else if (category.toUpperCase() === "INSURANCE") {
        if (f.policy_number?.value) updateData.insurancePolicyNo = f.policy_number.value;
        if (f.insurance_company?.value) updateData.insuranceCompany = f.insurance_company.value;
        if (f.policy_end_date?.value || f.valid_to?.value) {
          updateData.insuranceValidTo = f.policy_end_date?.value || f.valid_to?.value;
        }
      } else if (category.toUpperCase() === "PUC") {
        if (f.puc_certificate_number?.value || f.certificate_number?.value) {
          updateData.pucCertificateNo = f.puc_certificate_number?.value || f.certificate_number?.value;
        }
        if (f.valid_to?.value || f.valid_until?.value) {
          updateData.pucValidTo = f.valid_to?.value || f.valid_until?.value;
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.submission.update({
          where: { id: submission.id },
          data: updateData,
        });
      }

      // Reconcile and calculate mismatch
      const allExtractions = await prisma.documentExtraction.findMany({
        where: { submissionId: submission.id },
      });
      const recon = reconcileSubmissionData(
        {
          vehicleNumber: submission.vehicleNumber,
          driverName: submission.driverName,
          driverDob: submission.driverDob,
          driverMobile: submission.driverMobile,
          companyName: submission.companyName,
          addressPincode: submission.addressPincode,
          aadhaarNumber: updateData.aadhaarNumber || submission.aadhaarNumber,
          licenseNumber: updateData.licenseNumber || submission.licenseNumber,
        },
        allExtractions
      );

      await prisma.submission.update({
        where: { id: submission.id },
        data: { mismatchCount: recon.mismatchCount },
      });
    } catch (aiErr) {
      console.error("AI extraction error:", aiErr);
    }

    await recordAuditLog({
      userId: user.userId,
      userName: user.name,
      action: "UPLOAD_DOCUMENT",
      resourceType: "DOCUMENT",
      resourceId: document.id,
      details: {
        category,
        fileName,
        fileSize: buffer.length,
        submissionNo: submission.submissionNo,
      },
    });

    return NextResponse.json({
      success: true,
      document,
      extraction: extractionResult,
      message: "Document uploaded and processed successfully.",
    });
  } catch (error: any) {
    console.error("Upload document error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload document." },
      { status: 500 }
    );
  }
}
