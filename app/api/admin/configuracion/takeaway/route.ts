import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const row = await prisma.configuracion.findUnique({ where: { clave: "takeaway_iva" } });
    return Response.json({ takeaway_iva: row?.valor ?? "10" });
  } catch {
    return Response.json({ takeaway_iva: "10" });
  }
}
