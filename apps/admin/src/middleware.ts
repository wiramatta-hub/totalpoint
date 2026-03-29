import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Public routes (API for LIFF client)
  const publicApiRoutes = [
    "/api/auth",
    "/api/line",
    "/api/public",
    "/api/campaigns",
    "/api/rewards",
    "/api/orders",
    "/api/redemptions",
    "/api/members/me",
    "/api/points",
  ];

  const isPublicApi = publicApiRoutes.some((route) =>
    pathname.startsWith(route)
  );
  if (isPublicApi) return NextResponse.next();

  // Admin login page
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Root redirect
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthenticated ? "/dashboard" : "/login", req.url)
    );
  }

  // Protect all other routes
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
