import { jwtVerify } from "jose";
import { cookies } from "next/headers";

type Role = "admin" | "editor" | "general";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET no está definida en .env");
}
export const JWT_SECRET_BYTES = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getSessionRole(): Promise<Role | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    return (payload.role as Role) ?? null;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<{ role: Role; username: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    const role = (payload.role as Role) ?? null;
    if (!role) return null;
    return { role, username: (payload.username as string) ?? (payload.sub as string) ?? "unknown" };
  } catch {
    return null;
  }
}

export function deny403(): Response {
  return Response.json({ error: "No autorizado" }, { status: 403 });
}
