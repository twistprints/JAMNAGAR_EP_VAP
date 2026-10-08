import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import { getSupabaseAdmin, supabaseClient } from "./supabase";

export const AUTH_COOKIE_NAME = "jamnagar_session_token";

export interface SessionPayload {
  userId: string;
  username: string;
  role: "ADMIN" | "FIELD_USER";
  name: string;
  email?: string | null;
  authUserId?: string | null;
}

/**
 * Verifies a Supabase access token directly with Supabase Auth.
 */
export async function verifySupabaseToken(
  token: string
): Promise<{ id: string; email?: string } | null> {
  if (!token || token.trim() === "") return null;

  try {
    const admin = getSupabaseAdmin();
    if (admin) {
      const { data, error } = await admin.auth.getUser(token);
      if (!error && data?.user) {
        return { id: data.user.id, email: data.user.email };
      }
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data?.user) {
        return { id: data.user.id, email: data.user.email };
      }
    }
  } catch (err) {
    // Supabase Auth verification error
  }

  return null;
}

/**
 * Retrieves the current authenticated user session from cookies.
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const authUser = await verifySupabaseToken(token);
    if (!authUser) return null;

    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { authUserId: authUser.id },
          ...(authUser.email ? [{ email: authUser.email.toLowerCase() }] : []),
        ],
      },
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

    return {
      userId: dbUser.id,
      username: dbUser.username,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as "ADMIN" | "FIELD_USER",
      authUserId: dbUser.authUserId || authUser.id,
    };
  } catch (error: any) {
    return null;
  }
}

/**
 * Authenticates an incoming Next.js API request via Supabase Auth.
 * Reads token from HTTP-only cookie, Authorization Bearer header, or custom session token header.
 */
export async function authenticateRequest(req: NextRequest): Promise<SessionPayload | null> {
  let token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) {
    const customHeaderToken = req.headers.get("x-session-token");
    if (customHeaderToken) {
      token = customHeaderToken.trim();
    }
  }

  if (!token) return null;

  // 1. Verify token with Supabase Auth authority
  const authUser = await verifySupabaseToken(token);
  if (!authUser) return null;

  // 2. Fetch authoritative user profile and role from database
  try {
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { authUserId: authUser.id },
          ...(authUser.email ? [{ email: authUser.email.toLowerCase() }] : []),
        ],
      },
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

    // Link authUserId if not set
    if (!dbUser.authUserId) {
      try {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { authUserId: authUser.id },
        });
      } catch (_) {}
    }

    return {
      userId: dbUser.id,
      username: dbUser.username,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as "ADMIN" | "FIELD_USER",
      authUserId: dbUser.authUserId || authUser.id,
    };
  } catch (dbErr) {
    console.error("Database lookup error during auth:", dbErr);
    return null;
  }
}

/**
 * Standard Server-Side Auth Guards
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: SessionPayload } | { errorResponse: NextResponse }> {
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
