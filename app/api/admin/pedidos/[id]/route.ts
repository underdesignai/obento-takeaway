import { prisma } from "@/lib/prisma";
import { sendOrderReady } from "@/lib/email";
import { getSessionRole, deny403 } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSessionRole())) return deny403();
  const { id } = await params;
  try {
    const body = await req.json();
    const { estado, _action } = body;

    if (_action === "notify") {
      const pedido = await prisma.pedidos.findUnique({
        where: { id: Number(id) },
        include: { pedido_items: true },
      });
      if (!pedido) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
      if (!pedido.cliente_email) return Response.json({ error: "El pedido no tiene email" }, { status: 400 });

      await sendOrderReady(pedido.cliente_email, {
        nombre: pedido.cliente_nombre,
        orderNumber: pedido.numero_pedido || `OB-${String(pedido.id).padStart(4, "0")}`,
        horaRecogida: pedido.hora_recogida ?? undefined,
        lang: "es",
      });
      return Response.json({ ok: true });
    }

    if (!estado) return Response.json({ error: "estado requerido" }, { status: 400 });

    const dbEstado = estado === "nuevo" ? "recibido" : estado;

    const pedido = await prisma.pedidos.update({
      where: { id: Number(id) },
      data: {
        estado_pedido: dbEstado,
        updated_at: new Date(),
      },
    });

    // Envío automático al pasar a 'listo' si el cliente tiene email registrado
    if (dbEstado === "listo" && pedido.cliente_email) {
      sendOrderReady(pedido.cliente_email, {
        nombre: pedido.cliente_nombre,
        orderNumber: pedido.numero_pedido || `OB-${String(pedido.id).padStart(4, "0")}`,
        horaRecogida: pedido.hora_recogida ?? undefined,
        lang: "es",
      }).catch((err) => console.error("Error auto-notificando por email en takeaway:", err));
    }

    return Response.json(pedido);
  } catch (e) {
    console.error("[pedidos/id]", e);
    return Response.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}
