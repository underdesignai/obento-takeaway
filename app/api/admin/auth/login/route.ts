import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { JWT_SECRET_BYTES } from "@/lib/auth";

export async function POST(req: Request) {
  const { user, password } = await req.json();

  if (user === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
    const token = await new SignJWT({ sub: user, role: "admin", username: user })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("8h")
      .sign(JWT_SECRET_BYTES);

    const cookieStore = await cookies();
    cookieStore.set("admin_token", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
    return Response.json({ ok: true, role: "admin" });
  }

  return Response.json({ error: "Credenciales incorrectas" }, { status: 401 });
}
