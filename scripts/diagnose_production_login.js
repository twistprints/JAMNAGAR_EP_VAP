/**
 * Production Login Diagnosis Script
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class MockWebSocket {};
}

const prisma = new PrismaClient();

async function diagnose() {
  console.log("================================================================");
  console.log("JAMNAGAR PASS MANAGEMENT - PRODUCTION LOGIN DIAGNOSTICS");
  console.log("================================================================");

  // 1. Environment Check
  console.log("\n1. ENVIRONMENT VARIABLES STATUS:");
  console.log("  NEXT_PUBLIC_SUPABASE_URL    :", process.env.NEXT_PUBLIC_SUPABASE_URL ? "CONFIGURED" : "MISSING");
  console.log("  NEXT_PUBLIC_SUPABASE_ANON_KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "CONFIGURED" : "MISSING");
  console.log("  SUPABASE_SERVICE_ROLE_KEY   :", process.env.SUPABASE_SERVICE_ROLE_KEY ? "CONFIGURED" : "MISSING");
  console.log("  DATABASE_URL                :", process.env.DATABASE_URL ? "CONFIGURED" : "MISSING");
  console.log("  GEMINI_API_KEY              :", process.env.GEMINI_API_KEY ? "CONFIGURED" : "MISSING");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Critical: Supabase URL or Service Role Key missing.");
    process.exit(1);
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Check Database Profiles
  console.log("\n2. APPLICATION DATABASE PROFILES:");
  const dbUsers = await prisma.user.findMany();
  console.log(`Found ${dbUsers.length} user profile(s) in DB:`);
  for (const u of dbUsers) {
    console.log(`  - Username: ${u.username} | Email: ${u.email} | Role: ${u.role} | Active: ${u.active} | AuthUID: ${u.authUserId || "NOT LINKED"}`);
  }

  // 3. Check Supabase Auth Users
  console.log("\n3. SUPABASE AUTH USERS:");
  const { data: sbUsers, error: sbErr } = await supabaseAdmin.auth.admin.listUsers();
  if (sbErr) {
    console.error("❌ Error querying Supabase Auth:", sbErr.message);
  } else {
    console.log(`Found ${sbUsers?.users?.length || 0} user(s) in Supabase Auth:`);
    for (const u of (sbUsers?.users || [])) {
      console.log(`  - Email: ${u.email} | ID: ${u.id} | Confirmed: ${!!u.email_confirmed_at} | Role in Metadata: ${u.user_metadata?.role || "none"}`);
    }
  }

  // 4. Test Supabase Auth Sign In for Admin
  console.log("\n4. TEST SUPABASE AUTH SIGN IN (ADMIN):");
  const testAdminEmail = "saketdeva@jamnagar.gov.in";
  const testAdminPassword = process.env.ADMIN_PASSWORD || "8180922746@lucifer1927";

  const { data: signInData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email: testAdminEmail,
    password: testAdminPassword,
  });

  if (signInErr) {
    console.log(`  Result for ${testAdminEmail}: FAILED (${signInErr.message})`);
  } else {
    console.log(`  Result for ${testAdminEmail}: SUCCESS`);
    console.log(`  Authenticated User ID: ${signInData.user?.id}`);
    console.log(`  Session token generated: YES (${signInData.session?.access_token.substring(0, 20)}...)`);
  }

  // 5. Test Field User Sign In
  console.log("\n5. TEST SUPABASE AUTH SIGN IN (FIELD USER):");
  const fieldUsers = dbUsers.filter(u => u.role === "FIELD_USER");
  console.log(`Found ${fieldUsers.length} FIELD_USER profile(s) in DB.`);

  console.log("\n================================================================");
  console.log("DIAGNOSTICS COMPLETED.");
  console.log("================================================================");

  await prisma.$disconnect();
}

diagnose().catch(console.error);
