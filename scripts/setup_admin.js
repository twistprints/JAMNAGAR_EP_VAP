/**
 * Jamnagar Pass Management System - First Admin Setup Script
 * Usage:
 *   node scripts/setup_admin.js [admin_email] [admin_password] [admin_name] [admin_username]
 * Or configure via environment variables:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_USERNAME
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");

const prisma = new PrismaClient();

async function bootstrapFirstAdmin() {
  console.log("================================================================");
  console.log("JAMNAGAR PASS MANAGEMENT - FIRST ADMIN SETUP");
  console.log("================================================================");

  const email = process.argv[2] || process.env.ADMIN_EMAIL || "saketdeva@jamnagar.gov.in";
  const password = process.argv[3] || process.env.ADMIN_PASSWORD || "8180922746@lucifer1927";
  const name = process.argv[4] || process.env.ADMIN_NAME || "Saket Deva";
  const username = process.argv[5] || process.env.ADMIN_USERNAME || "Saketdeva";

  if (!email || !password || password.length < 6) {
    console.error("Error: Admin email and a password of at least 6 characters are required.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  let authUserId = null;

  // Supabase Auth provision if service key is present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Try creating user in Supabase Auth
      const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role: "ADMIN", username },
      });

      if (!sbError && sbData.user) {
        authUserId = sbData.user.id;
        console.log("✓ Supabase Auth user created successfully.");
      } else if (sbError) {
        if (sbError.message.includes("already been registered") || sbError.status === 422) {
          console.log("ℹ Supabase Auth user already registered. Updating password...");
          // Try to find user and update
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = listData?.users?.find(u => u.email === email);
          if (existingUser) {
            authUserId = existingUser.id;
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
            console.log("✓ Supabase Auth password updated.");
          }
        } else {
          console.warn("Supabase Auth notice:", sbError.message);
        }
      }
    } catch (sbEx) {
      console.warn("Supabase Auth connection notice:", sbEx.message);
    }
  }

  // Upsert Admin in Database
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
        passwordHash,
        authUserId: authUserId || existingAdmin.authUserId,
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`✓ Updated existing Admin record: ${adminRecord.username} (${adminRecord.email})`);
  } else {
    adminRecord = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        authUserId,
        role: "ADMIN",
        active: true,
      },
    });
    console.log(`✓ Created new Admin record: ${adminRecord.username} (${adminRecord.email})`);
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: adminRecord.id,
      userName: adminRecord.name,
      action: "SETUP_FIRST_ADMIN",
      resourceType: "USER",
      resourceId: adminRecord.id,
      details: `Initialized Master Administrator account (${adminRecord.username})`,
    },
  });

  console.log("\n================================================================");
  console.log("FIRST ADMIN SETUP COMPLETED SUCCESSFULLY!");
  console.log("Username / Login ID:", adminRecord.username);
  console.log("Email:", adminRecord.email);
  console.log("Role:", adminRecord.role);
  console.log("================================================================");
}

bootstrapFirstAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
