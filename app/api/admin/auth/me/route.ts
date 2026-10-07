import { getSessionUser, deny403 } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return deny403();
  return Response.json(user);
}
