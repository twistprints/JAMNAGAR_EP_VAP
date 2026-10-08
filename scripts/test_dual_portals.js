/**
 * Dual Login Portals & Role Enforcement Verification Suite
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

async function runDualPortalTests() {
  console.log("================================================================");
  console.log("JAMNAGAR PASS MANAGEMENT - DUAL PORTAL & ROLE ENFORCEMENT TEST");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(title, condition, detail = "") {
    if (condition) {
      console.log(`[PASS] ${title} ${detail}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} ${detail}`);
      failed++;
    }
  }

  // Set up Admin and Field credentials for base checks
  const adminLoginId = "admin";
  const adminPassword = "Admin@Jamnagar2026!";
  const fieldLoginId = "field";
  const fieldPassword = "field123";

  // 1. TEST 1: Landing portal selector page GET /
  try {
    const res = await fetch(`${BASE_URL}/`);
    const text = await res.text();
    assert(
      "TEST 1: GET / serves Portal Selector with Admin and User Login links",
      res.status === 200 && text.includes("ADMIN LOGIN") && text.includes("USER LOGIN"),
      `(Status: ${res.status})`
    );
  } catch (e) {
    assert("TEST 1: GET /", false, e.message);
  }

  // 2. TEST 2: Admin Login page GET /admin/login
  try {
    const res = await fetch(`${BASE_URL}/admin/login`);
    assert(
      "TEST 2: GET /admin/login serves dedicated Admin Login page",
      res.status === 200,
      `(Status: ${res.status})`
    );
  } catch (e) {
    assert("TEST 2: GET /admin/login", false, e.message);
  }

  // 3. TEST 3: User Login page GET /user/login
  try {
    const res = await fetch(`${BASE_URL}/user/login`);
    assert(
      "TEST 3: GET /user/login serves dedicated User Login page",
      res.status === 200,
      `(Status: ${res.status})`
    );
  } catch (e) {
    assert("TEST 3: GET /user/login", false, e.message);
  }

  // 4. TEST 4: FIELD_USER attempts to log in via /admin/login (portalType = ADMIN) -> Blocked 403
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: fieldLoginId,
        password: fieldPassword,
        portalType: "ADMIN",
      }),
    });
    const data = await res.json();
    assert(
      "TEST 4: FIELD_USER attempting /admin/login is denied with 403",
      res.status === 403 && data.error === "Access denied. This login is for administrators only.",
      `(Status: ${res.status}, Error: "${data.error}")`
    );
  } catch (e) {
    assert("TEST 4: Field user at admin login", false, e.message);
  }

  // 5. TEST 5: ADMIN attempts to log in via /user/login (portalType = FIELD_USER) -> Blocked 403
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: adminLoginId,
        password: adminPassword,
        portalType: "FIELD_USER",
      }),
    });
    const data = await res.json();
    assert(
      "TEST 5: ADMIN attempting /user/login is denied with 403",
      res.status === 403 && data.error === "This login is for authorized field users.",
      `(Status: ${res.status}, Error: "${data.error}")`
    );
  } catch (e) {
    assert("TEST 5: Admin user at field login", false, e.message);
  }

  // 6. TEST 6: ADMIN logs in via /admin/login -> 200 OK, role ADMIN, redirectTo /admin
  let adminToken = "";
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: adminLoginId,
        password: adminPassword,
        portalType: "ADMIN",
      }),
    });
    const data = await res.json();
    adminToken = data.token;
    assert(
      "TEST 6: ADMIN logs in successfully via /admin/login",
      res.status === 200 && data.user.role === "ADMIN" && data.redirectTo === "/admin",
      `(Role: ${data?.user?.role}, Redirect: ${data?.redirectTo})`
    );
  } catch (e) {
    assert("TEST 6: Admin login", false, e.message);
  }

  // 7. TEST 7: FIELD_USER logs in via /user/login -> 200 OK, role FIELD_USER, redirectTo /field
  let fieldToken = "";
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: fieldLoginId,
        password: fieldPassword,
        portalType: "FIELD_USER",
      }),
    });
    const data = await res.json();
    fieldToken = data.token;
    assert(
      "TEST 7: FIELD_USER logs in successfully via /user/login",
      res.status === 200 && data.user.role === "FIELD_USER" && data.redirectTo === "/field",
      `(Role: ${data?.user?.role}, Redirect: ${data?.redirectTo})`
    );
  } catch (e) {
    assert("TEST 7: Field user login", false, e.message);
  }

  // 8. TEST 8: Server-side API protection - FIELD_USER cannot access admin APIs
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${fieldToken}` },
    });
    assert(
      "TEST 8: FIELD_USER cannot access /api/admin/users (403 Forbidden)",
      res.status === 403,
      `(Status: ${res.status})`
    );
  } catch (e) {
    assert("TEST 8: API protection", false, e.message);
  }

  // 9. TEST 9: ADMIN creates a new FIELD_USER account
  const testOfficerName = "Test Field User";
  const testOfficerEmail = "test-field-user@example.com";
  const testOfficerPassword = "TestPassword123!";
  let createdOfficerId = null;

  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: testOfficerName,
        email: testOfficerEmail,
        username: "test_field_user",
        password: testOfficerPassword,
        phone: "+91 9879000111",
        active: true,
      }),
    });
    const data = await res.json();
    createdOfficerId = data?.user?.id;
    assert(
      "TEST 9: ADMIN creates new FIELD_USER account via User Management API",
      (res.status === 200 || res.status === 201) && data.user && data.user.role === "FIELD_USER",
      `(User ID: ${data?.user?.id}, Role: ${data?.user?.role})`
    );
  } catch (e) {
    assert("TEST 9: Admin create field user", false, e.message);
  }

  // 10. TEST 10: Newly created FIELD_USER logs in via /user/login
  let newOfficerToken = "";
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: testOfficerEmail,
        password: testOfficerPassword,
        portalType: "FIELD_USER",
      }),
    });
    const data = await res.json();
    newOfficerToken = data.token;
    assert(
      "TEST 10: Newly created FIELD_USER logs in via /user/login successfully",
      res.status === 200 && data.user && data.user.role === "FIELD_USER",
      `(User: ${data?.user?.name}, Role: ${data?.user?.role})`
    );
  } catch (e) {
    assert("TEST 10: New field user login", false, e.message);
  }

  // 11. TEST 11: Newly created FIELD_USER is blocked from /admin/login
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: testOfficerEmail,
        password: testOfficerPassword,
        portalType: "ADMIN",
      }),
    });
    const data = await res.json();
    assert(
      "TEST 11: Newly created FIELD_USER is blocked from /admin/login (403)",
      res.status === 403 && data.error === "Access denied. This login is for administrators only.",
      `(Status: ${res.status}, Error: "${data.error}")`
    );
  } catch (e) {
    assert("TEST 11: New user blocked from admin login", false, e.message);
  }

  // 12. TEST 12: ADMIN deactivates Test Field User
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/${createdOfficerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ active: false }),
    });
    const data = await res.json();
    assert(
      "TEST 12: ADMIN deactivates Test Field User",
      res.status === 200 && data.user && data.user.active === false,
      `(Active: ${data?.user?.active})`
    );
  } catch (e) {
    assert("TEST 12: Admin deactivate user", false, e.message);
  }

  // 13. TEST 13: Deactivated Test Field User is rejected on login attempt (403)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: testOfficerEmail,
        password: testOfficerPassword,
        portalType: "FIELD_USER",
      }),
    });
    const data = await res.json();
    assert(
      "TEST 13: Deactivated user login attempt is rejected with 403 Account Deactivated",
      res.status === 403 && data.error && data.error.includes("deactivated"),
      `(Status: ${res.status}, Error: "${data.error}")`
    );
  } catch (e) {
    assert("TEST 13: Deactivated user login", false, e.message);
  }

  // 14. TEST 14: ADMIN resets password for user
  const newSecretPassword = "ResetPassword999!";
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users/${createdOfficerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        password: newSecretPassword,
        active: true, // Reactivate to test login with new password
      }),
    });
    const data = await res.json();
    assert(
      "TEST 14: ADMIN resets password & reactivates user",
      res.status === 200 && data.user && data.user.active === true,
      `(Active: ${data?.user?.active})`
    );

    // Verify login with new password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId: testOfficerEmail,
        password: newSecretPassword,
        portalType: "FIELD_USER",
      }),
    });
    const loginData = await loginRes.json();
    assert(
      "TEST 14b: User successfully logs in with new password",
      loginRes.status === 200 && loginData.user && loginData.user.role === "FIELD_USER",
      `(Status: ${loginRes.status})`
    );
  } catch (e) {
    assert("TEST 14: Reset password", false, e.message);
  }

  // 15. CLEANUP: Delete the test user and all associated test audit logs
  if (createdOfficerId) {
    await prisma.auditLog.deleteMany({ where: { userId: createdOfficerId } });
    await prisma.user.delete({ where: { id: createdOfficerId } });
    console.log("✓ Cleaned up test user account and logs. Zero test data remains.");
  }

  console.log("\n================================================================");
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED out of 15 tests`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDualPortalTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
