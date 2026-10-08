export interface ReconciliationField {
  fieldName: string;
  fieldLabel: string;
  manualValue: string | null;
  aiValue: string | null;
  sourceCategory: string | null;
  status: "MATCH" | "MISMATCH" | "NOT_FOUND";
  confidence?: number;
  notes?: string;
}

export interface ReconciliationReport {
  fields: ReconciliationField[];
  totalFields: number;
  matchCount: number;
  mismatchCount: number;
  notFoundCount: number;
  hasMismatches: boolean;
}

function cleanString(val: string | null | undefined): string {
  if (!val) return "";
  return val
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function cleanName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function reconcileSubmissionData(
  manualData: {
    vehicleNumber?: string | null;
    vehicleType?: string | null;
    driverName?: string | null;
    driverMobile?: string | null;
    driverDob?: string | null;
    companyName?: string | null;
    addressTaluka?: string | null;
    addressDistrict?: string | null;
    addressState?: string | null;
    addressPincode?: string | null;
    aadhaarNumber?: string | null;
    licenseNumber?: string | null;
  },
  extractions: Array<{
    category: string;
    extractedFields: string | Record<string, any>;
  }>
): ReconciliationReport {
  // Aggregate all AI extracted fields across documents
  const aiMap: Record<string, { value: string | null; category: string; confidence: number }> = {};

  for (const ext of extractions) {
    let parsedFields: Record<string, any> = {};
    if (typeof ext.extractedFields === "string") {
      try {
        parsedFields = JSON.parse(ext.extractedFields);
      } catch (e) {
        parsedFields = {};
      }
    } else {
      parsedFields = ext.extractedFields || {};
    }

    for (const [fName, fieldObj] of Object.entries(parsedFields)) {
      const val = typeof fieldObj === "object" && fieldObj !== null ? fieldObj.value : fieldObj;
      const conf = typeof fieldObj === "object" && fieldObj !== null ? fieldObj.confidence || 0.9 : 0.9;
      if (val !== null && val !== undefined && String(val).trim().length > 0) {
        aiMap[fName] = {
          value: String(val).trim(),
          category: ext.category,
          confidence: conf,
        };
      }
    }
  }

  const comparisons: ReconciliationField[] = [];

  // 1. Vehicle Number
  const mVehicle = manualData.vehicleNumber || null;
  const aiVehicle = aiMap.vehicle_number?.value || aiMap.registration_number?.value || null;
  let vehicleStatus: "MATCH" | "MISMATCH" | "NOT_FOUND" = "NOT_FOUND";
  if (mVehicle && aiVehicle) {
    vehicleStatus = cleanString(mVehicle) === cleanString(aiVehicle) ? "MATCH" : "MISMATCH";
  } else if (mVehicle || aiVehicle) {
    vehicleStatus = "NOT_FOUND";
  }
  comparisons.push({
    fieldName: "vehicleNumber",
    fieldLabel: "Vehicle Number",
    manualValue: mVehicle,
    aiValue: aiVehicle,
    sourceCategory: aiMap.vehicle_number?.category || "RC / Insurance",
    status: vehicleStatus,
    confidence: aiMap.vehicle_number?.confidence,
  });

  // 2. Driver Name
  const mDriver = manualData.driverName || null;
  const aiDriver = aiMap.name?.value || aiMap.driver_name?.value || null;
  let driverStatus: "MATCH" | "MISMATCH" | "NOT_FOUND" = "NOT_FOUND";
  if (mDriver && aiDriver) {
    driverStatus = cleanName(mDriver) === cleanName(aiDriver) ? "MATCH" : "MISMATCH";
  } else if (mDriver || aiDriver) {
    driverStatus = "NOT_FOUND";
  }
  comparisons.push({
    fieldName: "driverName",
    fieldLabel: "Driver Name",
    manualValue: mDriver,
    aiValue: aiDriver,
    sourceCategory: aiMap.name?.category || "Aadhaar / Licence",
    status: driverStatus,
    confidence: aiMap.name?.confidence,
  });

  // 3. Driver DOB
  const mDob = manualData.driverDob || null;
  const aiDob = aiMap.date_of_birth?.value || aiMap.dob?.value || null;
  let dobStatus: "MATCH" | "MISMATCH" | "NOT_FOUND" = "NOT_FOUND";
  if (mDob && aiDob) {
    dobStatus = cleanString(mDob) === cleanString(aiDob) ? "MATCH" : "MISMATCH";
  } else if (mDob || aiDob) {
    dobStatus = "NOT_FOUND";
  }
  comparisons.push({
    fieldName: "driverDob",
    fieldLabel: "Date of Birth",
    manualValue: mDob,
    aiValue: aiDob,
    sourceCategory: aiMap.date_of_birth?.category || "Aadhaar / Licence",
    status: dobStatus,
    confidence: aiMap.date_of_birth?.confidence,
  });

  // 4. Aadhaar Number
  const mAadhaar = manualData.aadhaarNumber || null;
  const aiAadhaar = aiMap.aadhaar_number?.value || null;
  let aadhaarStatus: "MATCH" | "MISMATCH" | "NOT_FOUND" = "NOT_FOUND";
  if (mAadhaar && aiAadhaar) {
    aadhaarStatus = cleanString(mAadhaar) === cleanString(aiAadhaar) ? "MATCH" : "MISMATCH";
  } else if (mAadhaar || aiAadhaar) {
    aadhaarStatus = "NOT_FOUND";
  }
  comparisons.push({
    fieldName: "aadhaarNumber",
    fieldLabel: "Aadhaar Number",
    manualValue: mAadhaar,
    aiValue: aiAadhaar,
    sourceCategory: "Aadhaar Card",
    status: aadhaarStatus,
    confidence: aiMap.aadhaar_number?.confidence,
  });

  // 5. Driving Licence Number
  const mLic = manualData.licenseNumber || null;
  const aiLic = aiMap.license_number?.value || null;
  let licStatus: "MATCH" | "MISMATCH" | "NOT_FOUND" = "NOT_FOUND";
  if (mLic && aiLic) {
    licStatus = cleanString(mLic) === cleanString(aiLic) ? "MATCH" : "MISMATCH";
  } else if (mLic || aiLic) {
    licStatus = "NOT_FOUND";
  }
  comparisons.push({
    fieldName: "licenseNumber",
    fieldLabel: "Driving Licence No",
    manualValue: mLic,
    aiValue: aiLic,
    sourceCategory: "Driving Licence",
    status: licStatus,
    confidence: aiMap.license_number?.confidence,
  });

  // 6. Pincode
  const mPin = manualData.addressPincode || null;
  const aiPin = aiMap.pincode?.value || null;
  let pinStatus: "MATCH" | "MISMATCH" | "NOT_FOUND" = "NOT_FOUND";
  if (mPin && aiPin) {
    pinStatus = cleanString(mPin) === cleanString(aiPin) ? "MATCH" : "MISMATCH";
  } else if (mPin || aiPin) {
    pinStatus = "NOT_FOUND";
  }
  comparisons.push({
    fieldName: "addressPincode",
    fieldLabel: "Address Pincode",
    manualValue: mPin,
    aiValue: aiPin,
    sourceCategory: "Aadhaar Card",
    status: pinStatus,
    confidence: aiMap.pincode?.confidence,
  });

  const matchCount = comparisons.filter((c) => c.status === "MATCH").length;
  const mismatchCount = comparisons.filter((c) => c.status === "MISMATCH").length;
  const notFoundCount = comparisons.filter((c) => c.status === "NOT_FOUND").length;

  return {
    fields: comparisons,
    totalFields: comparisons.length,
    matchCount,
    mismatchCount,
    notFoundCount,
    hasMismatches: mismatchCount > 0,
  };
}
