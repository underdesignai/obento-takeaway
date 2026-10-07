import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET_BYTES = new TextEncoder().encode(process.env.JWT_SECRET || "obento-admin-secret-2026-takeaway");

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    await jwtVerify(token, JWT_SECRET_BYTES);
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("admin_token");
    return res;
  }
}

export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon.ico|manifest.webmanifest|images).*)",
  ],
};
