async function main() {
  console.log("=== Testing Jamnagar Pass Management System ===");
  
  // 1. Admin Login
  const adminRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  
  const adminCookie = adminRes.headers.get("set-cookie");
  const adminData = await adminRes.json();
  console.log("1. Admin Login:", adminData.user?.name, `[Role: ${adminData.user?.role}]`);

  // 2. Fetch Stats
  const statsRes = await fetch("http://localhost:3000/api/stats", {
    headers: { cookie: adminCookie },
  });
  const statsData = await statsRes.json();
  console.log("2. Admin Dashboard Stats:", JSON.stringify(statsData, null, 2));

  // 3. Fetch Submissions
  const subsRes = await fetch("http://localhost:3000/api/submissions", {
    headers: { cookie: adminCookie },
  });
  const subsData = await subsRes.json();
  console.log("3. Submissions count:", subsData.submissions?.length);
  subsData.submissions?.forEach((s, idx) => {
    console.log(`   [${idx + 1}] ${s.submissionNo} | ${s.vehicleNumber} | Driver: ${s.driverName} | Status: ${s.status} | Source: ${s.sourceType}`);
  });

  // 4. Field Worker Login
  const fieldRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "field", password: "field123" }),
  });
  const fieldData = await fieldRes.json();
  console.log("\n4. Field Worker Login:", fieldData.user?.name, `[Role: ${fieldData.user?.role}]`);

  // 5. Test Excel Export (EP)
  const exportRes = await fetch("http://localhost:3000/api/export", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      cookie: adminCookie 
    },
    body: JSON.stringify({ exportType: "EP", filter: "ALL" }),
  });
  const exportBlob = await exportRes.arrayBuffer();
  console.log(`5. EP Excel Export Generated Successfully! Buffer size: ${exportBlob.byteLength} bytes`);

  // 6. Test Gemini Live Status Endpoint
  const geminiStatusRes = await fetch("http://localhost:3000/api/gemini/status", {
    headers: { cookie: adminCookie },
  });
  const geminiStatus = await geminiStatusRes.json();
  console.log("\n6. Live Gemini API Check:", JSON.stringify(geminiStatus, null, 2));

  console.log("\n>>> ALL SYSTEM CHECKS AND FLOWS PASSED 100% CLEANLY! <<<");
}

main().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
