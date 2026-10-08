import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

const AUTH_COOKIE_NAME = "jamnagar_session_token";

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

  // 2. Extract Supabase session token from cookie, header, or bearer
  const token =
    req.cookies.get(AUTH_COOKIE_NAME)?.value ||
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")?.substring(7).trim()
      : null);

  let isValidSession = false;
  let userRole: "ADMIN" | "FIELD_USER" | null = null;

  if (token) {
    try {
      const payload = decodeJwt(token);
      const currentTime = Math.floor(Date.now() / 1000);

      // Check if token has subject (user ID) and is not expired
      if (payload && payload.sub && (!payload.exp || payload.exp > currentTime)) {
        isValidSession = true;
        const metaRole = (payload.user_metadata as any)?.role || (payload.app_metadata as any)?.role;
        if (metaRole === "ADMIN" || metaRole === "FIELD_USER") {
          userRole = metaRole;
        }
      }
    } catch (e) {
      isValidSession = false;
    }
  }

  // 3. Handle login and public portal selection pages
  const isLoginPage = pathname === "/admin/login" || pathname === "/user/login" || pathname === "/login";
  
  if (isLoginPage) {
    if (isValidSession) {
      // If already logged in, redirect to assigned portal
      const target = userRole === "ADMIN" ? "/admin" : "/field";
      return NextResponse.redirect(new URL(target, req.url));
    }
    return NextResponse.next();
  }

  // 4. Handle root path `/` (Public portal selector)
  if (pathname === "/") {
    return NextResponse.next();
  }

  // 5. API routes pass through to route handlers (they perform authoritative verification)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 6. Protect Admin Web Portal (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    if (!isValidSession) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole === "FIELD_USER") {
      // FIELD_USER trying to access admin portal -> redirect to /field
      return NextResponse.redirect(new URL("/field", req.url));
    }

    return NextResponse.next();
  }

  // 7. Protect Field Web Portal (/field/*)
  if (pathname.startsWith("/field")) {
    if (!isValidSession) {
      const loginUrl = new URL("/user/login", req.url);
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
