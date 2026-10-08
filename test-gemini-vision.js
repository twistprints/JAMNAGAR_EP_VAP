const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.resolve(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  }
}



async function testLiveVisionExtraction() {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  console.log("=== Testing Real Gemini Vision Extraction on RC Image ===");
  console.log("Model:", modelName);

  const testImagePath = path.resolve(__dirname, "uploads/JAMNAGAR/2026-10-07/HR68C4741/RC/RC_1791407079098.jpeg");
  console.log("Testing image:", testImagePath);

  const fileBuffer = fs.readFileSync(testImagePath);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const imagePart = {
    inlineData: {
      data: fileBuffer.toString("base64"),
      mimeType: "image/jpeg",
    },
  };

  const prompt = `You are an expert OCR extractor for Indian Vehicle Registration Certificates (RC).
Extract ONLY clearly visible fields. Do not guess.
Extract in JSON format:
{
  "vehicle_number": "Vehicle Registration Number",
  "owner_name": "Registered Owner name",
  "vehicle_type": "Vehicle Type / Class",
  "chassis_number": "Chassis Number (VIN)",
  "engine_number": "Engine Number"
}
Return STRICTLY valid JSON.`;

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text().trim();
  console.log("\n>>> LIVE GEMINI VISION OCR OUTPUT <<<");
  console.log(responseText);
  console.log("\n>>> LIVE VISION EXTRACTION TEST SUCCESSFUL! <<<");
}

testLiveVisionExtraction().catch(console.error);
