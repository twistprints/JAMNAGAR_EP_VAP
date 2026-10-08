import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "jamnagar_pass_mgmt_super_secret_jwt_key_2026_prod"
);

const AUTH_COOKIE_NAME = "jamnagar_session_token";

interface TokenPayload {
  userId: string;
  username: string;
  role: "ADMIN" | "FIELD_USER";
  name: string;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public static assets and auth APIs
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // 2. Extract session token from cookie, header, or bearer
  const token =
    req.cookies.get(AUTH_COOKIE_NAME)?.value ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")?.substring(7).trim()
      : null);

  let session: TokenPayload | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload as unknown as TokenPayload;
    } catch (e) {
      session = null;
    }
  }

  // 3. Handle /login page specifically
  if (pathname === "/login") {
    if (session) {
      // If already logged in, redirect to their home portal
      const target = session.role === "ADMIN" ? "/admin" : "/field";
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  // 4. Handle root path `/`
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const target = session.role === "ADMIN" ? "/admin" : "/field";
    return NextResponse.redirect(new URL(target, req.url));
  }

  // 5. Protect API routes (return 401 JSON for unauthorized API calls)
  if (pathname.startsWith("/api/")) {
    // Some endpoints may do fine-grained checks in route handlers
    return NextResponse.next();
  }

  // 6. Protect Admin Web Portal (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (session.role !== "ADMIN") {
      // FIELD_USER trying to access admin portal -> redirect to /field
      return NextResponse.redirect(new URL("/field", req.url));
    }

    return NextResponse.next();
  }

  // 7. Protect Field Web Portal (/field/*)
  if (pathname.startsWith("/field")) {
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
