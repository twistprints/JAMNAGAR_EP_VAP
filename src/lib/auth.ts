import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getSupabaseAdmin, supabaseClient } from "./supabase";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "jamnagar_pass_mgmt_super_secret_jwt_key_2026_prod"
);

export const AUTH_COOKIE_NAME = "jamnagar_session_token";

export interface SessionPayload {
  userId: string;
  username: string;
  role: "ADMIN" | "FIELD_USER";
  name: string;
  email?: string | null;
  authUserId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30-day persistent session
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch (err: any) {
    return null;
  }
}

/**
 * Retrieves the current authenticated user session from cookies or headers
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch (error: any) {
    return null;
  }
}

/**
 * Authenticates an incoming Next.js API request.
 * Reads token from HTTP-only cookie, Authorization Bearer header, or custom session token header.
 */
export async function authenticateRequest(req: NextRequest): Promise<SessionPayload | null> {
  let session: SessionPayload | null = null;

  // 1. Check HTTP-only cookie first
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    session = await verifySessionToken(token);
  }

  // 2. Fallback: Check Authorization Bearer header
  if (!session) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const bearerToken = authHeader.substring(7).trim();
      if (bearerToken) {
        session = await verifySessionToken(bearerToken);
      }
    }
  }

  // 3. Fallback: Check x-session-token custom header
  if (!session) {
    const customHeaderToken = req.headers.get("x-session-token");
    if (customHeaderToken) {
      session = await verifySessionToken(customHeaderToken.trim());
    }
  }

  if (!session) return null;

  // Verify user existence and active status directly against the database (authoritative check)
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        authUserId: true,
      },
    });

    if (!dbUser || !dbUser.active) {
      return null;
    }

    // Always use authoritative database role
    return {
      userId: dbUser.id,
      username: dbUser.username,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as "ADMIN" | "FIELD_USER",
      authUserId: dbUser.authUserId,
    };
  } catch (dbErr) {
    // If database lookup fails temporarily, return verified token session
    return session;
  }
}

/**
 * Standard Server-Side Auth Guards
 */
export async function requireAuth(req: NextRequest): Promise<{ user: SessionPayload } | { errorResponse: NextResponse }> {
  const user = await authenticateRequest(req);
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      ),
    };
  }
  return { user };
}

export async function requireRole(
  req: NextRequest,
  requiredRole: "ADMIN" | "FIELD_USER"
): Promise<{ user: SessionPayload } | { errorResponse: NextResponse }> {
  const authResult = await requireAuth(req);
  if ("errorResponse" in authResult) return authResult;

  if (authResult.user.role !== requiredRole) {
    return {
      errorResponse: NextResponse.json(
        { error: `Forbidden: ${requiredRole} role required.` },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user };
}

export async function requireAnyRole(
  req: NextRequest,
  allowedRoles: Array<"ADMIN" | "FIELD_USER">
): Promise<{ user: SessionPayload } | { errorResponse: NextResponse }> {
  const authResult = await requireAuth(req);
  if ("errorResponse" in authResult) return authResult;

  if (!allowedRoles.includes(authResult.user.role)) {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden: Insufficient role permissions." },
        { status: 403 }
      ),
    };
  }

  return { user: authResult.user };
}

export function requireAuthResponse() {
  return NextResponse.json(
    { error: "Authentication required. Please log in." },
    { status: 401 }
  );
}

export function requireAdminResponse() {
  return NextResponse.json(
    { error: "Forbidden: Admin access required." },
    { status: 403 }
  );
}
