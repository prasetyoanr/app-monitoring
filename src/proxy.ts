import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/auth/constants";

function isPublicPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/offline.html" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/b/") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/inbox/approval/") ||
    pathname.startsWith("/backups/submit/")
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Keep existing bookmarks and approval links working after the Inbox rename.
  if (pathname === "/troubleshooting" || pathname.startsWith("/troubleshooting/")) {
    const inboxUrl = new URL(request.url);
    inboxUrl.pathname = pathname.replace(/^\/troubleshooting/, "/inbox");
    return NextResponse.redirect(inboxUrl);
  }

  if (isPublicPath(pathname)) return NextResponse.next();

  if (!request.cookies.has(SESSION_COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
