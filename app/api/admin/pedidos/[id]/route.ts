import { prisma } from "@/lib/prisma";
import { sendOrderReady, sendOrderPreparing } from "@/lib/email";
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

      await prisma.pedidos.update({
        where: { id: Number(id) },
        data: { cliente_notificado: true, updated_at: new Date() },
      });

      const isPagado = pedido.metodo_pago !== "restaurante" && pedido.metodo_pago !== "local";

      sendOrderReady(pedido.cliente_email, {
        nombre: pedido.cliente_nombre,
        orderNumber: pedido.numero_pedido || `OB-${String(pedido.id).padStart(4, "0")}`,
        horaRecogida: pedido.hora_recogida ?? undefined,
        isPagado,
        total: Number(pedido.total),
        lang: "es",
      }).catch((err) => console.error("Error enviando email en notify:", err));

      return Response.json({ ok: true, clienteNotificado: true });
    }

    if (!estado) return Response.json({ error: "estado requerido" }, { status: 400 });

    const dbEstado = estado === "nuevo" ? "recibido" : estado;

    const dataToUpdate: any = {
      estado_pedido: dbEstado,
      updated_at: new Date(),
    };
    if (dbEstado === "recibido" || dbEstado === "preparando") {
      dataToUpdate.cliente_notificado = false;
    }
    if (dbEstado === "entregado") {
      dataToUpdate.estado_pago = "pagado";
    }

    const pedido = await prisma.pedidos.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });

    // Envío automático al pasar a 'preparando' si el cliente tiene email registrado
    if (dbEstado === "preparando" && pedido.cliente_email) {
      sendOrderPreparing(pedido.cliente_email, {
        nombre: pedido.cliente_nombre,
        orderNumber: pedido.numero_pedido || `OB-${String(pedido.id).padStart(4, "0")}`,
        horaRecogida: pedido.hora_recogida ?? undefined,
        tipoEntrega: pedido.tipo_entrega,
        direccionEntrega: pedido.direccion_entrega,
        direccionDetalles: pedido.direccion_detalles,
        lang: "es",
      }).catch((err) => console.error("Error auto-notificando por email en preparando:", err));
    }

    return Response.json(pedido);
  } catch (e) {
    console.error("[pedidos/id]", e);
    return Response.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}
