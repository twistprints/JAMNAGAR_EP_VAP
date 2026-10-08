const { GoogleGenerativeAI } = require("@google/generative-ai");
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

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("=== Testing Live Gemini API with Current Models ===");
  console.log("API Key configured:", apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : "None");

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTest = [
    "gemini-3.8-flash",
    "gemini-3.8-flash-preview",
    "gemini-3.1-pro-preview",
    "gemini-3.0-flash",
    "gemini-2.0-flash-exp",
  ];

  for (const modelName of modelsToTest) {
    try {
      process.stdout.write(`Testing model '${modelName}'... `);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Respond with the exact word 'ACTIVE'.");
      const text = result.response.text().trim();
      console.log(`✓ SUCCESS! Response: "${text}"`);
      return modelName;
    } catch (err) {
      console.log(`✗ Error: ${err?.message || err}`);
    }
  }
}

testModels().then((workingModel) => {
  if (workingModel) {
    console.log(`\n>>> SUCCESS! Working Gemini Model: ${workingModel} <<<`);
  } else {
    console.log("\n>>> Testing completed. <<<");
  }
}).catch(console.error);
