import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

export type ExtractionSource = "GEMINI_VISION" | "GEMINI_ERROR" | "AI EXTRACTION UNAVAILABLE";

export interface ExtractedFieldItem {
  value: string | null;
  confidence: number;
  raw_text?: string;
}

export interface DocumentExtractionResult {
  document_type: string;
  fields: Record<string, ExtractedFieldItem>;
  warnings: string[];
  raw_text: string;
  source: ExtractionSource;
  model?: string;
  errorMessage?: string;
  error?: string;
}

const EXTRACTION_SCHEMAS: Record<string, { prompt: string; sampleFields: Record<string, any> }> = {
  AADHAAR: {
    prompt: `You are an expert government document OCR extractor specialized in Indian Aadhaar cards.
Analyze this document image carefully. Extract ONLY the fields that are clearly visible. If a field is missing, obscured, or unreadable, set value to null. DO NOT hallucinate or guess.

Extract the following fields in JSON format:
{
  "name": "Full name of the person as printed",
  "date_of_birth": "DD/MM/YYYY or YYYY format",
  "gender": "Male / Female / Other",
  "aadhaar_number": "12-digit number (e.g. 1234 5678 9012)",
  "address": "Full residential address as printed",
  "pincode": "6-digit postal pincode",
  "state": "State name",
  "district": "District name",
  "taluka": "Taluka / Tehsil / Sub-district if visible"
}
For each field, return an object with "value" (string or null) and "confidence" (number between 0.0 and 1.0).
Also include a "raw_text" string of all text visible and "warnings" array.`,
    sampleFields: {
      name: null,
      date_of_birth: null,
      gender: null,
      aadhaar_number: null,
      address: null,
      pincode: null,
      state: null,
      district: null,
      taluka: null,
    },
  },

  DRIVING_LICENSE: {
    prompt: `You are an expert document OCR extractor for Indian Driving Licences.
Analyze this driving licence image carefully. Extract ONLY visible fields. Do not guess or hallucinate.

Extract in JSON format:
{
  "name": "Driver name",
  "father_or_husband_name": "Father / Husband name",
  "date_of_birth": "DD/MM/YYYY",
  "license_number": "Driving licence number (e.g. GJ1020180012345)",
  "valid_from": "Issue or valid from date",
  "valid_to": "Non-transport or general expiry date",
  "transport_valid_to": "Transport vehicle validity expiry date",
  "hazardous_valid_to": "Hazardous goods validity expiry date if present",
  "class_of_vehicle": "Class authorization (e.g. LMV, HGV, TRANS)",
  "address": "Address as printed",
  "blood_group": "Blood group if mentioned",
  "issuing_authority": "RTO office or authority",
  "state": "State",
  "RTO": "RTO Code / City"
}
For each field, return {"value": string | null, "confidence": number}.
Include "raw_text" and "warnings".`,
    sampleFields: {
      name: null,
      father_or_husband_name: null,
      date_of_birth: null,
      license_number: null,
      valid_from: null,
      valid_to: null,
      transport_valid_to: null,
      hazardous_valid_to: null,
      class_of_vehicle: null,
      address: null,
      blood_group: null,
      issuing_authority: null,
      state: null,
      RTO: null,
    },
  },

  RC: {
    prompt: `You are an expert OCR extractor for Indian Vehicle Registration Certificates (RC).
Extract ONLY clearly visible fields. Do not guess.

Extract in JSON format:
{
  "vehicle_number": "Vehicle Registration Number (e.g. GJ10AB1234)",
  "owner_name": "Registered Owner name",
  "vehicle_type": "Vehicle Type / Category (e.g. Truck, Tanker, Trailer, Pickup, Car)",
  "vehicle_class": "Vehicle Class / Description",
  "chassis_number": "Chassis Number (VIN)",
  "engine_number": "Engine Number",
  "registration_date": "Date of initial registration DD/MM/YYYY",
  "fitness_valid_to": "Fitness certificate validity expiry date",
  "tax_valid_to": "Road Tax validity date",
  "fuel_type": "Fuel type (Diesel / Petrol / CNG / Electric)",
  "emission_norms": "BS4 / BS6 / Bharat Stage",
  "financier": "Financier / Hypothecation details if any",
  "unladen_weight": "Unladen Weight in KG",
  "gross_vehicle_weight": "Gross Vehicle Weight (GVW) in KG"
}
For each field, return {"value": string | null, "confidence": number}.
Include "raw_text" and "warnings".`,
    sampleFields: {
      vehicle_number: null,
      owner_name: null,
      vehicle_type: null,
      vehicle_class: null,
      chassis_number: null,
      engine_number: null,
      registration_date: null,
      fitness_valid_to: null,
      tax_valid_to: null,
      fuel_type: null,
      emission_norms: null,
      financier: null,
      unladen_weight: null,
      gross_vehicle_weight: null,
    },
  },

  PUC: {
    prompt: `You are an expert OCR extractor for Indian Pollution Under Control (PUC) Certificates.
Extract ONLY clearly visible fields.

Extract in JSON format:
{
  "vehicle_number": "Vehicle Registration Number",
  "puc_certificate_number": "PUC Certificate Serial No.",
  "valid_from": "Issue Date (DD/MM/YYYY)",
  "valid_to": "Validity End Date (DD/MM/YYYY)",
  "testing_center_code": "Code of PUC testing center",
  "fuel_type": "Fuel type",
  "carbon_monoxide_reading": "CO reading if visible",
  "hydrocarbon_reading": "HC reading if visible"
}
For each field, return {"value": string | null, "confidence": number}.
Include "raw_text" and "warnings".`,
    sampleFields: {
      vehicle_number: null,
      puc_certificate_number: null,
      valid_from: null,
      valid_to: null,
      testing_center_code: null,
      fuel_type: null,
      carbon_monoxide_reading: null,
      hydrocarbon_reading: null,
    },
  },

  INSURANCE: {
    prompt: `You are an expert OCR extractor for Indian Motor Vehicle Insurance Policies.
Analyze this insurance certificate / policy document. Extract all visible fields.

Extract in JSON format:
{
  "vehicle_number": "Vehicle Registration Number",
  "policy_number": "Insurance Policy / Certificate No",
  "insurance_company": "Name of the insurance company",
  "insured_name": "Policyholder / Insured name",
  "policy_start_date": "Period of Insurance - From Date/Time",
  "policy_end_date": "Period of Insurance - To Date/Midnight",
  "vehicle_type": "Make / Model / Vehicle Class",
  "registration_number": "Registration number",
  "certificate_number": "Certificate number",
  "policy_type": "Package / Comprehensive / Third Party Only"
}
For each field, return {"value": string | null, "confidence": number}.
Include "raw_text" and "warnings".`,
    sampleFields: {
      vehicle_number: null,
      policy_number: null,
      insurance_company: null,
      insured_name: null,
      policy_start_date: null,
      policy_end_date: null,
      vehicle_type: null,
      registration_number: null,
      certificate_number: null,
      policy_type: null,
    },
  },

  DRIVER_PHOTO: {
    prompt: `Analyze this image to verify if it contains a clear driver passport size photograph.
Return JSON:
{
  "face_detected": true/false,
  "quality_score": 0.0 to 1.0,
  "clarity": "Good" / "Moderate" / "Poor" / "Blurred",
  "comments": "Description of portrait photograph"
}
For each field return {"value": any, "confidence": number}. Include "raw_text" and "warnings".`,
    sampleFields: {
      face_detected: null,
      quality_score: null,
      clarity: null,
      comments: null,
    },
  },
};

export async function verifyGeminiConnection(): Promise<{
  configured: boolean;
  success: boolean;
  model: string;
  message: string;
  timestamp: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  if (!apiKey || apiKey === "") {
    return {
      configured: false,
      success: false,
      model: modelName,
      message: "GEMINI_API_KEY is not configured in .env file.",
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Respond with the single word 'READY' if you are active and receiving this message.");
    const text = result.response.text().trim();

    return {
      configured: true,
      success: true,
      model: modelName,
      message: `Gemini Vision API is active and verified! Response: ${text}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    return {
      configured: true,
      success: false,
      model: modelName,
      message: `Gemini API test failed: ${error?.message || error}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function extractDocumentData(
  imageInput: string | Buffer,
  category: string,
  options?: {
    mimeType?: string;
    fileName?: string;
    hintVehicleNo?: string;
  } | string
): Promise<DocumentExtractionResult> {
  const normalizedCategory = category.toUpperCase().replace(/\s+/g, "_");
  const schemaConfig = EXTRACTION_SCHEMAS[normalizedCategory] || EXTRACTION_SCHEMAS.RC;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  let fileBuffer: Buffer | null = null;
  let fileSize = 0;
  let mimeType = "image/jpeg";
  let docName = "document.jpg";

  if (Buffer.isBuffer(imageInput)) {
    fileBuffer = imageInput;
    fileSize = imageInput.length;
    if (typeof options === "object" && options) {
      if (options.mimeType) mimeType = options.mimeType;
      if (options.fileName) docName = options.fileName;
    }
  } else if (typeof imageInput === "string") {
    const absoluteImagePath = path.isAbsolute(imageInput)
      ? imageInput
      : path.resolve(process.cwd(), imageInput);
    docName = path.basename(absoluteImagePath);

    if (fs.existsSync(absoluteImagePath)) {
      try {
        fileBuffer = await fs.promises.readFile(absoluteImagePath);
        fileSize = fileBuffer.length;
        mimeType = getMimeType(absoluteImagePath);
      } catch (_) {}
    }
  }

  const fileExists = fileBuffer !== null && fileBuffer.length > 0;

  // Exact requested Development Diagnostic Logs
  console.log("----------------------------------------");
  console.log("EXTRACTION STARTED");
  console.log(`Document: ${docName}`);
  console.log(`Category: ${normalizedCategory}`);
  console.log(`File available: ${fileExists ? "YES" : "NO"}`);
  console.log(`File size: ${fileSize} bytes (${(fileSize / 1024).toFixed(1)} KB)`);
  console.log(`MIME type: ${mimeType}`);
  console.log(`API key configured: ${apiKey && apiKey.length > 5 ? "YES" : "NO"}`);
  console.log(`Gemini model: ${modelName}`);

  if (!fileExists || !fileBuffer) {
    console.log("EXTRACTION FAILED: Document data is empty or not available.");
    console.log("----------------------------------------");
    return {
      document_type: normalizedCategory.toLowerCase(),
      fields: createEmptyFields(schemaConfig.sampleFields),
      warnings: ["Document data is not available."],
      raw_text: "",
      source: "GEMINI_ERROR",
      model: modelName,
      errorMessage: "Document data not available.",
      error: "Document data not available.",
    };
  }

  if (!apiKey || apiKey.length <= 5) {
    console.log("EXTRACTION FAILED: GEMINI_API_KEY not configured.");
    console.log("----------------------------------------");
    return {
      document_type: normalizedCategory.toLowerCase(),
      fields: createEmptyFields(schemaConfig.sampleFields),
      warnings: ["GEMINI_API_KEY is not configured in .env file."],
      raw_text: "",
      source: "GEMINI_ERROR",
      model: modelName,
      errorMessage: "GEMINI_API_KEY is not configured in server environment.",
      error: "GEMINI_API_KEY is not configured in server environment.",
    };
  }

  const candidateModels = Array.from(
    new Set([
      modelName,
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.5-flash",
      "gemini-flash-latest",
    ])
  );

  let lastError: any = null;

  for (const activeModel of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Gemini request started (Model: ${activeModel}, Attempt: ${attempt})`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: activeModel });

        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${schemaConfig.prompt}\n\nCRITICAL: Respond ONLY with a valid JSON object matching the schema. No conversational commentary, no preamble.`,
                },
                {
                  inlineData: {
                    data: fileBuffer.toString("base64"),
                    mimeType: mimeType,
                  },
                },
              ],
            },
          ],
        });

        console.log("Gemini response received");
        console.log("Gemini response status: 200 OK");
        const responseText = result.response.text().trim();
        console.log(`Gemini raw response length: ${responseText.length} characters`);

        // Robust JSON extraction
        let cleanJson = responseText;
        const jsonBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
          cleanJson = jsonBlockMatch[1].trim();
        } else {
          const firstBrace = responseText.indexOf("{");
          const lastBrace = responseText.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanJson = responseText.substring(firstBrace, lastBrace + 1).trim();
          }
        }

        let parsed: any;
        try {
          parsed = JSON.parse(cleanJson);
          console.log("JSON parsing result: SUCCESS");
        } catch (jsonErr: any) {
          console.log("JSON parsing result: FAILED (" + jsonErr.message + ")");
          throw jsonErr;
        }

        // Normalize output to { fields: { [k]: { value, confidence } } }
        const fields: Record<string, ExtractedFieldItem> = {};
        let extractedCount = 0;

        for (const [key, val] of Object.entries(parsed)) {
          if (key === "raw_text" || key === "warnings" || key === "document_type") continue;

          if (typeof val === "object" && val !== null && "value" in val) {
            const item = val as any;
            const strVal = item.value !== undefined && item.value !== null ? String(item.value).trim() : null;
            fields[key] = {
              value: strVal === "" ? null : strVal,
              confidence: typeof item.confidence === "number" ? item.confidence : 0.9,
              raw_text: item.raw_text ? String(item.raw_text) : undefined,
            };
            if (fields[key].value) extractedCount++;
          } else {
            const strVal = val !== null && val !== undefined ? String(val).trim() : null;
            fields[key] = {
              value: strVal === "" ? null : strVal,
              confidence: strVal ? 0.92 : 0.0,
            };
            if (fields[key].value) extractedCount++;
          }
        }

        console.log(`Final extraction field count: ${extractedCount} non-null fields out of ${Object.keys(fields).length} schema fields`);
        console.log("----------------------------------------");

        return {
          document_type: normalizedCategory.toLowerCase(),
          fields,
          warnings: parsed.warnings || [],
          raw_text: parsed.raw_text || responseText.substring(0, 500),
          source: "GEMINI_VISION",
          model: activeModel,
        };
      } catch (error: any) {
        lastError = error;
        console.error(`Gemini request failed on ${activeModel} (attempt ${attempt}): ${error?.message || error}`);

        const isTransient =
          error?.message?.includes("503") ||
          error?.message?.includes("429") ||
          error?.message?.includes("high demand") ||
          error?.message?.includes("RESOURCE_EXHAUSTED");

        if (isTransient && attempt === 1) {
          console.log("Transient rate limit/demand spike encountered. Retrying in 1.5s...");
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        break;
      }
    }
  }

  console.log("ACTUAL API ERROR:", lastError?.message || lastError);
  console.log("----------------------------------------");

  // Return GEMINI_ERROR with no fabricated values
  return {
    document_type: normalizedCategory.toLowerCase(),
    fields: createEmptyFields(schemaConfig.sampleFields),
    warnings: [`GEMINI_ERROR: ${lastError?.message || "Failed to communicate with Gemini API"}`],
    raw_text: "",
    source: "GEMINI_ERROR",
    model: modelName,
    errorMessage: lastError?.message || "Gemini API call failed",
    error: lastError?.message || "Gemini API call failed",
  };
}

function createEmptyFields(sampleFields: Record<string, any>): Record<string, ExtractedFieldItem> {
  const empty: Record<string, ExtractedFieldItem> = {};
  for (const key of Object.keys(sampleFields)) {
    empty[key] = {
      value: null,
      confidence: 0,
    };
  }
  return empty;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".pdf":
      return "application/pdf";
    default:
      return "image/jpeg";
  }
}
