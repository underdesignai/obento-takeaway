import { prisma } from "@/lib/prisma";
import { getSessionRole, getSessionUser, deny403 } from "@/lib/auth";

async function getConfig(clave: string): Promise<string | null> {
  const row = await prisma.configuracion.findUnique({ where: { clave } });
  return row?.valor ?? null;
}

async function setConfig(clave: string, valor: string) {
  await prisma.configuracion.upsert({
    where: { clave },
    update: { valor },
    create: { clave, valor },
  });
}

function calcHasta(tipo: string): string {
  const now = new Date();
  switch (tipo) {
    case "1h":     now.setHours(now.getHours() + 1); break;
    case "2h":     now.setHours(now.getHours() + 2); break;
    case "3h":     now.setHours(now.getHours() + 3); break;
    case "4h":     now.setHours(now.getHours() + 4); break;
    case "cierre": now.setHours(23, 59, 0, 0);       break;
    case "hoy":    now.setHours(23, 59, 59, 999);    break;
    default:       now.setHours(now.getHours() + 2);
  }
  return now.toISOString();
}

export async function GET() {
  if (!(await getSessionRole())) return deny403();

  const [modo, hasta, tipo, por, umbralPedidos, umbralMinutos, manualOverride] = await Promise.all([
    getConfig("takeaway_modo"),
    getConfig("takeaway_limite_hasta"),
    getConfig("takeaway_limite_tipo"),
    getConfig("takeaway_limite_por"),
    getConfig("takeaway_umbral_pedidos"),
    getConfig("takeaway_umbral_minutos"),
    getConfig("takeaway_manual_override"),
  ]);

  const modoActual = modo ?? "activo";
  const hastaVal   = hasta ?? "";

  // Auto-expiración
  if (modoActual === "limitado" && hastaVal && new Date(hastaVal) < new Date()) {
    await Promise.all([
      setConfig("takeaway_modo", "activo"),
      setConfig("takeaway_limite_hasta", ""),
      setConfig("takeaway_manual_override", "false"),
    ]);
    return Response.json({
      modo: "activo",
      hasta: null,
      tipo: null,
      por: null,
      umbralPedidos: umbralPedidos ?? "35",
      umbralMinutos: umbralMinutos ?? "60",
      manualOverride: false,
    });
  }

  // Automatización por umbral de pedidos
  if (modoActual === "activo" && (manualOverride ?? "false") === "false") {
    const umbral = parseInt(umbralPedidos ?? "35");
    const count = await prisma.pedidos.count({
      where: { estado_pedido: { in: ["recibido", "preparando"] } },
    });
    if (count >= umbral) {
      const autoHasta = calcHasta("2h");
      await Promise.all([
        setConfig("takeaway_modo", "limitado"),
        setConfig("takeaway_limite_hasta", autoHasta),
        setConfig("takeaway_limite_tipo", "auto"),
        setConfig("takeaway_limite_por", "sistema"),
        setConfig("takeaway_limite_timestamp", new Date().toISOString()),
      ]);
      return Response.json({
        modo: "limitado",
        hasta: autoHasta,
        tipo: "auto",
        por: "sistema",
        umbralPedidos: umbralPedidos ?? "35",
        umbralMinutos: umbralMinutos ?? "60",
        manualOverride: false,
      });
    }
  }

  return Response.json({
    modo: modoActual,
    hasta: hastaVal || null,
    tipo: tipo || null,
    por: por || null,
    umbralPedidos: umbralPedidos ?? "35",
    umbralMinutos: umbralMinutos ?? "60",
    manualOverride: (manualOverride ?? "false") === "true",
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return deny403();

  const body = await req.json();
  const { accion, tipo, umbralPedidos, umbralMinutos } = body;

  if (accion === "limitar") {
    const hasta = calcHasta(tipo ?? "2h");
    await Promise.all([
      setConfig("takeaway_modo", "limitado"),
      setConfig("takeaway_limite_hasta", hasta),
      setConfig("takeaway_limite_tipo", tipo ?? "2h"),
      setConfig("takeaway_limite_por", user.username),
      setConfig("takeaway_manual_override", "true"),
      setConfig("takeaway_limite_timestamp", new Date().toISOString()),
    ]);
    return Response.json({ ok: true, modo: "limitado", hasta });
  }

  if (accion === "reactivar") {
    await Promise.all([
      setConfig("takeaway_modo", "activo"),
      setConfig("takeaway_limite_hasta", ""),
      setConfig("takeaway_limite_tipo", ""),
      setConfig("takeaway_manual_override", "true"),
    ]);
    return Response.json({ ok: true, modo: "activo" });
  }

  if (accion === "config") {
    const ops = [];
    if (umbralPedidos !== undefined) ops.push(setConfig("takeaway_umbral_pedidos", String(umbralPedidos)));
    if (umbralMinutos !== undefined) ops.push(setConfig("takeaway_umbral_minutos", String(umbralMinutos)));
    await Promise.all(ops);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Acción no válida" }, { status: 400 });
}
