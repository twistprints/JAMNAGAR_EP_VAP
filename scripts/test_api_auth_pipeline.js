/**
 * API Authentication & Role Portal Verification Test
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class MockWebSocket {};
}

const prisma = new PrismaClient();

async function testApiAuth() {
  console.log("==================================================================");
  console.log("TESTING PURE SUPABASE AUTH LOGIN & PORTAL ACCESS");
  console.log("==================================================================");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Test Admin Login with Supabase Auth
  console.log("1. Authenticating Admin via Supabase Auth...");
  const { data: adminLogin, error: adminErr } = await client.auth.signInWithPassword({
    email: "saketdeva@jamnagar.gov.in",
    password: "8180922746@lucifer1927",
  });

  if (adminErr || !adminLogin.session) {
    console.error("❌ Admin login failed:", adminErr?.message);
    process.exit(1);
  }
  console.log("✓ Admin authenticated successfully via Supabase Auth!");
  console.log("  Token received (first 30 chars):", adminLogin.session.access_token.substring(0, 30) + "...");
  console.log("  User UID:", adminLogin.user.id);

  // 2. Validate token using Supabase Auth authority
  console.log("\n2. Validating token against Supabase Auth authority...");
  const { data: tokenCheck, error: tcErr } = await adminClient.auth.getUser(adminLogin.session.access_token);
  if (tcErr || !tokenCheck.user) {
    console.error("❌ Token validation failed:", tcErr?.message);
    process.exit(1);
  }
  console.log("✓ Token validated directly with Supabase Auth authority:", tokenCheck.user.email);

  // 3. Database Role check
  const dbUser = await prisma.user.findFirst({
    where: { authUserId: tokenCheck.user.id },
  });
  console.log("\n3. Authoritative Database Role verification...");
  console.log("  Database User ID:", dbUser?.id);
  console.log("  Username:", dbUser?.username);
  console.log("  Role:", dbUser?.role);
  console.log("  Active Status:", dbUser?.active);

  if (dbUser?.role !== "ADMIN" || !dbUser?.active) {
    console.error("❌ Database role mismatch or inactive status!");
    process.exit(1);
  }
  console.log("✓ Database role verified: ADMIN (Active: true)");

  // 4. Test wrong password rejection
  console.log("\n4. Testing invalid password rejection...");
  const { data: badLogin, error: badErr } = await client.auth.signInWithPassword({
    email: "saketdeva@jamnagar.gov.in",
    password: "WrongPassword!999",
  });
  if (badErr && !badLogin.user) {
    console.log("✓ Invalid password correctly rejected by Supabase Auth:", badErr.message);
  } else {
    console.error("❌ Security flaw: Invalid password was accepted!");
    process.exit(1);
  }

  console.log("\n==================================================================");
  console.log("ALL API AUTHENTICATION & SECURITY CHECKS PASSED 100%!");
  console.log("==================================================================");

  await prisma.$disconnect();
}

testApiAuth().catch(console.error);
