import { NextResponse } from "next/server";
import { csrfExemptPath, csrfOriginOk } from "@/lib/csrf";

export function middleware(request: Request) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next();
  }
  if (csrfExemptPath(url.pathname)) {
    return NextResponse.next();
  }
  if (!url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  if (!csrfOriginOk(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
