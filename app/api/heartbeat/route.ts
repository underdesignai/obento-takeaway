import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    await prisma.configuracion.upsert({
      where: { clave: "monitor_takeaway_last_seen" },
      update: { valor: new Date().toISOString() },
      create: { clave: "monitor_takeaway_last_seen", valor: new Date().toISOString() },
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false });
  }
}
