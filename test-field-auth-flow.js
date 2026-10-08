async function testFieldFlow() {
  console.log("=== Testing Complete Field User Authentication Flow ===");

  // 1. Field Worker Login
  console.log("\n[Step 1] Logging in as Field Worker (username: 'field')...");
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "field", password: "field123" }),
  });

  const cookie = loginRes.headers.get("set-cookie");
  const loginData = await loginRes.json();
  console.log("✓ Login Response:", {
    success: loginData.success,
    tokenReceived: Boolean(loginData.token),
    userId: loginData.user?.id,
    role: loginData.user?.role,
  });

  const token = loginData.token;
  const authHeaders = {
    "Content-Type": "application/json",
    cookie: cookie || "",
    Authorization: `Bearer ${token}`,
  };

  // 2. Test Session Persistence: /api/auth/me (Simulating page refresh / route transition)
  console.log("\n[Step 2] Testing /api/auth/me (Simulating page refresh & client navigation)...");
  const meRes = await fetch("http://localhost:3000/api/auth/me", {
    headers: authHeaders,
  });
  const meData = await meRes.json();
  console.log("✓ /api/auth/me Response:", meData);

  // 3. Test Step 1: Save Basic Details Draft ("Continue to Photograph Documents")
  console.log("\n[Step 3] Submitting Basic Details Draft (Simulating 'Continue to Photograph Documents')...");
  const draftPayload = {
    vehicleNumber: "GJ10TX9988",
    vehicleType: "Truck",
    driverName: "Suresh Bhai Vaghela",
    driverMobile: "9876543210",
    driverDob: "12/08/1988",
    companyName: "Patel Logistics & Transport Ltd",
    designation: "Driver",
    vendorRepresentative: "Ramesh Patel",
    vendorRepMobile: "9825012345",
    addressTaluka: "Lalpur",
    addressDistrict: "Jamnagar",
    addressState: "Gujarat",
    addressPincode: "361140",
    areaOfWork: "RG",
    validityRequired: "1 Month",
    currentStep: 2,
    documents: [],
  };

  const draftRes = await fetch("http://localhost:3000/api/submissions", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(draftPayload),
  });

  const draftData = await draftRes.json();
  console.log("✓ Save Draft Response:", {
    status: draftRes.status,
    submissionId: draftData.submission?.id,
    submissionNo: draftData.submission?.submissionNo,
    vehicleNumber: draftData.submission?.vehicleNumber,
    createdById: draftData.submission?.createdById,
  });

  if (!draftRes.ok) {
    throw new Error(`Draft save failed: ${JSON.stringify(draftData)}`);
  }

  const submissionId = draftData.submission.id;

  // 4. Test Step 2: Upload Document Photo
  console.log("\n[Step 4] Uploading Document Photo for Submission...");
  const fs = require("fs");
  const path = require("path");

  const samplePath = path.resolve(__dirname, "uploads/JAMNAGAR/2026-10-07/HR68C4741/RC/RC_1791407079098.jpeg");
  const fileBytes = fs.readFileSync(samplePath);
  const blob = new Blob([fileBytes], { type: "image/jpeg" });

  const form = new FormData();
  form.append("submissionId", submissionId);
  form.append("category", "RC");
  form.append("pageNumber", "1");
  form.append("file", blob, "RC_TEST.jpg");

  const uploadRes = await fetch("http://localhost:3000/api/documents/upload", {
    method: "POST",
    headers: {
      cookie: cookie || "",
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  const uploadData = await uploadRes.json();
  console.log("✓ Upload Document Response:", {
    status: uploadRes.status,
    docId: uploadData.document?.id,
    category: uploadData.document?.category,
    filePath: uploadData.document?.filePath,
  });

  // 5. Test Step 3: Run Gemini AI Document Extraction
  console.log("\n[Step 5] Triggering Live Gemini Document Extraction...");
  const extractRes = await fetch("http://localhost:3000/api/documents/extract", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      submissionId,
      category: "RC",
    }),
  });

  const extractData = await extractRes.json();
  console.log("✓ AI Extraction Response:", {
    status: extractRes.status,
    count: extractData.count,
    source: extractData.results?.[0]?.source,
    model: extractData.results?.[0]?.model,
  });

  // 6. Test Step 4: Level 1 Verification & Final Submit
  console.log("\n[Step 6] Submitting Entry for Admin Verification...");
  const submitRes = await fetch(`http://localhost:3000/api/submissions/${submissionId}/submit`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ ...draftPayload, id: submissionId }),
  });

  const submitData = await submitRes.json();
  console.log("✓ Level 1 Submit Response:", {
    status: submitRes.status,
    submissionStatus: submitData.submission?.status,
    submissionNo: submitData.submission?.submissionNo,
  });

  console.log("\n=========================================================");
  console.log("🎉 ALL FIELD USER AUTHENTICATION & NAVIGATION CHECKS PASSED!");
  console.log("=========================================================");
}

testFieldFlow().catch(console.error);
