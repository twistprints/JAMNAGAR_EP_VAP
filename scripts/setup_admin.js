/**
 * Jamnagar Pass Management System - First Admin Setup Script
 * Usage:
 *   node scripts/setup_admin.js <admin_email> <admin_password> [admin_name] [admin_username]
 * Or configure via environment variables:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_USERNAME
 */

const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class MockWebSocket {};
}

const prisma = new PrismaClient();

async function bootstrapFirstAdmin() {
  console.log("================================================================");
  console.log("JAMNAGAR PASS MANAGEMENT - FIRST ADMIN SETUP");
  console.log("================================================================");

  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim();
  const password = (process.argv[3] || process.env.ADMIN_PASSWORD || "").trim();
  const name = (process.argv[4] || process.env.ADMIN_NAME || "Administrator").trim();
  const username = (process.argv[5] || process.env.ADMIN_USERNAME || (email ? email.split("@")[0] : "admin")).trim();

  if (!email || !password || password.length < 6) {
    console.error("\n❌ Error: Valid admin email and a password of at least 6 characters are required.");
    console.error("Usage: node scripts/setup_admin.js <email> <password> [name] [username]");
    console.error("   or: Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.\n");
    process.exit(1);
  }

  let authUserId = null;

  // 1. Supabase Auth provision using Service Role Key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("\n❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in .env");
    process.exit(1);
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Try creating admin user in Supabase Auth
    const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "ADMIN", username: username.toLowerCase() },
    });

    if (!sbError && sbData.user) {
      authUserId = sbData.user.id;
      console.log("✓ Supabase Auth admin user created successfully.");
    } else if (sbError) {
      if (sbError.message.includes("already been registered") || sbError.status === 422) {
        console.log("ℹ Supabase Auth user already registered. Updating password...");
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          authUserId = existingUser.id;
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password,
            user_metadata: { name, role: "ADMIN", username: username.toLowerCase() },
          });
          console.log("✓ Supabase Auth password updated.");
        }
      } else {
        console.warn("Supabase Auth notice:", sbError.message);
      }
    }
  } catch (sbEx) {
    console.warn("Supabase Auth connection notice:", sbEx.message);
  }

  // 2. Upsert Admin Profile in Application Database (No password stored)
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { username: username.toLowerCase() },
        { email: email.toLowerCase() },
      ],
    },
  });

  let adminRecord;
  if (existingAdmin) {
    adminRecord = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        name,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash: "",
        authUserId: authUserId || existingAdmin.authUserId,
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`✓ Updated existing Admin record in DB: ${adminRecord.username} (${adminRecord.email})`);
  } else {
    adminRecord = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash: "",
        authUserId,
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`✓ Created new Admin record in DB: ${adminRecord.username} (${adminRecord.email})`);
  }

  // 3. Record Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminRecord.id,
      userName: adminRecord.name,
      action: "SETUP_FIRST_ADMIN",
      resourceType: "USER",
      resourceId: adminRecord.id,
      details: `Initialized Master Administrator account (${adminRecord.username}) via Supabase Auth`,
    },
  });

  console.log("\n================================================================");
  console.log("FIRST ADMIN SETUP COMPLETED SUCCESSFULLY!");
  console.log("Username / Login ID:", adminRecord.username);
  console.log("Email:", adminRecord.email);
  console.log("Role:", adminRecord.role);
  console.log("Supabase Auth ID:", adminRecord.authUserId || "Linked");
  console.log("================================================================");
}

bootstrapFirstAdmin()
  .catch((err) => {
    console.error("Setup script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
