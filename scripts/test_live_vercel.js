/**
 * Diagnostic test against live Vercel URL
 */

require("dotenv").config();
const https = require("https");

async function testLiveVercel() {
  console.log("================================================================");
  console.log("TESTING LIVE VERCEL PRODUCTION API DIRECTLY");
  console.log("================================================================");

  const payload = JSON.stringify({
    loginId: "saketdeva@jamnagar.gov.in",
    password: process.env.ADMIN_PASSWORD || "8180922746@lucifer1927",
    portalType: "ADMIN",
  });

  const options = {
    hostname: "ensemble-jamnagar-ep-vap.vercel.app",
    port: 443,
    path: "/api/auth/login",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      "User-Agent": "Jamnagar-Auth-Diagnostics/1.0",
    },
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => { data += chunk; });
    res.on("end", () => {
      console.log("HTTP Status Code:", res.statusCode);
      console.log("Headers:", {
        "content-type": res.headers["content-type"],
        "x-vercel-id": res.headers["x-vercel-id"],
        "set-cookie": res.headers["set-cookie"] ? "PRESENT" : "ABSENT",
      });
      console.log("Response Body:", data);
    });
  });

  req.on("error", (e) => {
    console.error("Live test error:", e.message);
  });

  req.write(payload);
  req.end();
}

testLiveVercel();
