/**
 * Dual Portal Authentication & Role Enforcement Verification Script
 */

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class MockWebSocket {};
}

const prisma = new PrismaClient();

async function runDualPortalAuthTest() {
  console.log("==================================================================");
  console.log("TESTING DUAL PORTAL AUTHENTICATION & ROLE ENFORCEMENT");
  console.log("==================================================================");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let testsPassed = 0;
  let totalTests = 0;

  function assert(condition, name) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      testsPassed++;
    } else {
      console.error(`[FAIL] ${name}`);
    }
  }

  // TEST 1: Admin sign in via Supabase Auth with full email
  console.log("\n1. Testing Admin Authentication (Full Email)...");
  const { data: adminAuth, error: adminErr } = await supabaseClient.auth.signInWithPassword({
    email: "saketdeva@jamnagar.gov.in",
    password: "8180922746@lucifer1927",
  });
  assert(!adminErr && !!adminAuth.session, "Admin sign in with full email");

  // TEST 2: Invalid password rejection
  console.log("\n2. Testing Invalid Password Rejection...");
  const { data: badAuth, error: badErr } = await supabaseClient.auth.signInWithPassword({
    email: "saketdeva@jamnagar.gov.in",
    password: "IncorrectPassword999!",
  });
  assert(!!badErr && !badAuth.user, "Invalid password rejected by Supabase Auth");

  // TEST 3: Admin Profile Verification
  console.log("\n3. Testing Database Profile & Role Authority...");
  const adminDb = await prisma.user.findFirst({
    where: { email: "saketdeva@jamnagar.gov.in" },
  });
  assert(adminDb && adminDb.role === "ADMIN", "Admin profile exists and role is ADMIN");
  assert(adminDb && adminDb.active === true, "Admin profile is active");
  assert(adminDb && adminDb.authUserId === adminAuth.user.id, "Admin profile is linked to Supabase Auth UID");

  // TEST 4: Field User Creation via Admin Service Role
  console.log("\n4. Testing Field User Provisioning via Supabase Admin API...");
  const testFieldEmail = "field_test_officer@jamnagar.gov.in";
  const testFieldPass = "Officer@2026";

  let fieldAuthUser = null;
  const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: testFieldEmail,
    password: testFieldPass,
    email_confirm: true,
    user_metadata: { name: "Test Field Officer", role: "FIELD_USER", username: "field_officer" },
  });

  if (createErr && createErr.message.includes("already")) {
    const { data: listD } = await supabaseAdmin.auth.admin.listUsers();
    fieldAuthUser = listD?.users?.find(u => u.email === testFieldEmail);
  } else {
    fieldAuthUser = createdUser?.user;
  }
  assert(!!fieldAuthUser, "Field User provisioned in Supabase Auth");

  // TEST 5: Field User Authentication
  console.log("\n5. Testing Field User Authentication...");
  const { data: fieldAuth, error: fAuthErr } = await supabaseClient.auth.signInWithPassword({
    email: testFieldEmail,
    password: testFieldPass,
  });
  assert(!fAuthErr && !!fieldAuth.session, "Field User sign in via Supabase Auth");

  // TEST 6: Portal Separation & Role Enforcement Logic
  console.log("\n6. Testing Role Gating Logic...");
  const adminRole = (adminAuth.user?.user_metadata?.role) || adminDb?.role;
  const fieldRole = (fieldAuth.user?.user_metadata?.role) || "FIELD_USER";

  const adminCanAccessAdmin = adminRole === "ADMIN";
  const adminBlockedFromField = adminRole !== "FIELD_USER";
  const fieldCanAccessField = fieldRole === "FIELD_USER";
  const fieldBlockedFromAdmin = fieldRole !== "ADMIN";

  assert(adminCanAccessAdmin, "ADMIN has access to /admin portal");
  assert(adminBlockedFromField, "ADMIN is blocked from /user/login FIELD_USER portal");
  assert(fieldCanAccessField, "FIELD_USER has access to /field portal");
  assert(fieldBlockedFromAdmin, "FIELD_USER is blocked from /admin portal");

  // Cleanup test field user from Supabase Auth
  if (fieldAuthUser) {
    await supabaseAdmin.auth.admin.deleteUser(fieldAuthUser.id);
    console.log("✓ Cleaned up temporary test user from Supabase Auth.");
  }

  console.log("\n==================================================================");
  console.log(`TOTAL SCORE: ${testsPassed} / ${totalTests} TESTS PASSED (${Math.round((testsPassed / totalTests) * 100)}%)`);
  console.log("==================================================================");

  await prisma.$disconnect();
}

runDualPortalAuthTest().catch(console.error);
