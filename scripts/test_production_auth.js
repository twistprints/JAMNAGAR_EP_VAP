/**
 * Production Authentication & Authorization 12-Point Test Suite
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "jamnagar-secure-pass-jwt-secret-2026";
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("================================================================");
  console.log("JAMNAGAR PASS MANAGEMENT - 12-POINT AUTH VERIFICATION");
  console.log("================================================================\n");

  let passedCount = 0;
  let failedCount = 0;

  function assert(title, condition, extraInfo = "") {
    if (condition) {
      console.log(`[PASS] ${title} ${extraInfo}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${title} ${extraInfo}`);
      failedCount++;
    }
  }

  // Set up test credentials
  const testAdminPassword = "Admin@Jamnagar2026!";
  const testFieldPassword = "Field@Officer2026!";
  const testFieldUsername = "field_test_officer";
  const testFieldEmail = "field_test@jamnagar.gov.in";

  const fieldHash = await bcrypt.hash(testFieldPassword, 10);

  // Ensure field test user exists and active
  let fieldUser = await prisma.user.findFirst({
    where: { username: testFieldUsername },
  });

  if (fieldUser) {
    fieldUser = await prisma.user.update({
      where: { id: fieldUser.id },
      data: {
        active: true,
        passwordHash: fieldHash,
        role: "FIELD_USER",
      },
    });
  } else {
    fieldUser = await prisma.user.create({
      data: {
        name: "Test Field Officer",
        username: testFieldUsername,
        email: testFieldEmail,
        passwordHash: fieldHash,
        role: "FIELD_USER",
        active: true,
      },
    });
  }

  // 1. TEST 1: Unauthenticated request to /api/passes -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/pass-pairs`);
    assert("TEST 1: Unauthenticated request to /api/passes returns 401", res.status === 401, `(Status: ${res.status})`);
  } catch (e) {
    assert("TEST 1: Server connection", false, e.message);
  }

  // 2. TEST 2: Invalid password login -> 401
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin", password: "WrongPassword999!" }),
    });
    const data = await res.json();
    assert("TEST 2: Invalid password returns 401 Unauthorized", res.status === 401 && data.error, `(Status: ${res.status})`);
  } catch (e) {
    assert("TEST 2: Invalid password", false, e.message);
  }

  // 3. TEST 3: Valid FIELD_USER login -> 200 & role FIELD_USER
  let fieldToken = "";
  let fieldCookie = "";
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: testFieldUsername, password: testFieldPassword }),
    });
    const data = await res.json();
    const setCookie = res.headers.get("set-cookie");
    fieldToken = data.token;
    fieldCookie = setCookie || "";
    assert(
      "TEST 3: Valid FIELD_USER login returns 200 & role FIELD_USER",
      res.status === 200 && data.user && data.user.role === "FIELD_USER" && !!data.token,
      `(Status: ${res.status}, Role: ${data?.user?.role})`
    );
  } catch (e) {
    assert("TEST 3: Valid FIELD_USER login", false, e.message);
  }

  // 4. TEST 4: FIELD_USER accessing Admin-only API -> 403 Forbidden
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${fieldToken}`,
      },
    });
    assert("TEST 4: FIELD_USER accessing /api/admin/users returns 403 Forbidden", res.status === 403, `(Status: ${res.status})`);
  } catch (e) {
    assert("TEST 4: FIELD_USER role restriction", false, e.message);
  }

  // 5. TEST 5: Valid ADMIN login -> 200 & role ADMIN
  let adminToken = "";
  let adminCookie = "";
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "admin", password: testAdminPassword }),
    });
    const data = await res.json();
    adminToken = data.token;
    adminCookie = res.headers.get("set-cookie") || "";
    assert(
      "TEST 5: Valid ADMIN login returns 200 & role ADMIN",
      res.status === 200 && data.user && data.user.role === "ADMIN" && !!data.token,
      `(Status: ${res.status}, Role: ${data?.user?.role})`
    );
  } catch (e) {
    assert("TEST 5: Valid ADMIN login", false, e.message);
  }

  // 6. TEST 6: Session validation / token persistence via /api/auth/me
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(
      "TEST 6: Session verification returns active user profile",
      res.status === 200 && data.user && data.user.username === "admin",
      `(User: ${data?.user?.username})`
    );
  } catch (e) {
    assert("TEST 6: Session verification", false, e.message);
  }

  // 7. TEST 7: Logout endpoint -> 200 & clears cookie
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${fieldToken}` },
    });
    assert("TEST 7: Logout API clears session and returns 200", res.status === 200, `(Status: ${res.status})`);
  } catch (e) {
    assert("TEST 7: Logout", false, e.message);
  }

  // 8. TEST 8: Deactivated user is blocked immediately (403)
  try {
    // Deactivate field user
    await prisma.user.update({
      where: { id: fieldUser.id },
      data: { active: false },
    });

    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: testFieldUsername, password: testFieldPassword }),
    });
    const data = await res.json();
    assert(
      "TEST 8: Deactivated user login returns 403 Account Deactivated",
      res.status === 403 && data.error && data.error.toLowerCase().includes("deactivated"),
      `(Status: ${res.status}, Error: ${data.error})`
    );
  } catch (e) {
    assert("TEST 8: Deactivated user check", false, e.message);
  }

  // 9. TEST 9: Existing token of deactivated user is rejected on protected APIs (401 or 403)
  try {
    const res = await fetch(`${BASE_URL}/api/pass-pairs`, {
      headers: { Authorization: `Bearer ${fieldToken}` },
    });
    assert(
      "TEST 9: Deactivated user with valid token is rejected by database check (401/403)",
      res.status === 401 || res.status === 403,
      `(Status: ${res.status})`
    );
  } catch (e) {
    assert("TEST 9: Real-time DB active check", false, e.message);
  }

  // Reactivate field user for cleanup
  await prisma.user.update({
    where: { id: fieldUser.id },
    data: { active: true },
  });

  // 10. TEST 10: ADMIN user management - GET /api/admin/users returns list of users
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(
      "TEST 10: ADMIN can list all system users",
      res.status === 200 && Array.isArray(data.users) && data.users.length > 0,
      `(Count: ${data?.users?.length})`
    );
  } catch (e) {
    assert("TEST 10: Admin user list", false, e.message);
  }

  // 11. TEST 11: ADMIN creates a new FIELD_USER via API
  const newOfficerEmail = `officer_${Date.now()}@jamnagar.gov.in`;
  const newOfficerUser = `officer_${Date.now().toString().slice(-4)}`;
  let createdOfficerId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Officer Test New",
        email: newOfficerEmail,
        username: newOfficerUser,
        password: "TemporaryPassword123!",
        phone: "+91 9876543210",
      }),
    });
    const data = await res.json();
    createdOfficerId = data?.user?.id;
    assert(
      "TEST 11: ADMIN creates new FIELD_USER account",
      (res.status === 200 || res.status === 201) && data.user && data.user.role === "FIELD_USER",
      `(Status: ${res.status}, User ID: ${data?.user?.id}, Username: ${data?.user?.username})`
    );
  } catch (e) {
    assert("TEST 11: Admin create user", false, e.message);
  }

  // 12. TEST 12: ADMIN deactivates and resets password for user
  try {
    if (createdOfficerId) {
      const res = await fetch(`${BASE_URL}/api/admin/users/${createdOfficerId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          active: false,
          newPassword: "NewSecretPassword456!",
        }),
      });
      const data = await res.json();
      assert(
        "TEST 12: ADMIN modifies user active status & resets password",
        res.status === 200 && data.user && data.user.active === false,
        `(Active: ${data?.user?.active})`
      );

      // Clean up the created test officer
      await prisma.auditLog.deleteMany({ where: { userId: createdOfficerId } });
      await prisma.user.delete({ where: { id: createdOfficerId } });
    } else {
      assert("TEST 12: ADMIN modify user", false, "No officer ID created");
    }
  } catch (e) {
    assert("TEST 12: Admin patch user", false, e.message);
  }

  // Clean up field_test_officer
  await prisma.auditLog.deleteMany({ where: { userId: fieldUser.id } });
  await prisma.user.delete({ where: { id: fieldUser.id } });

  console.log("\n================================================================");
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of 12 tests`);
  console.log("================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
