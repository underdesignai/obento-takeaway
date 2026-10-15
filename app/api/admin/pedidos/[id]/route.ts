import { prisma } from "@/lib/prisma";
import { sendOrderReady, sendOrderPreparing, sendOrderInDeliveryEmail } from "@/lib/email";
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

      // Los pedidos a domicilio NO se notifican para recogida en local
      if (pedido.tipo_entrega === "domicilio" || pedido.tipo_entrega === "delivery") {
        return Response.json({ ok: false, error: "Los pedidos a domicilio se avisan al salir a reparto" }, { status: 400 });
      }

      await prisma.pedidos.update({
        where: { id: Number(id) },
        data: { cliente_notificado: true, updated_at: new Date() },
      });

      const isPagado = pedido.metodo_pago !== "restaurante" && pedido.metodo_pago !== "local";

      sendOrderReady(pedido.cliente_email, {
        nombre: pedido.cliente_nombre,
        orderNumber: pedido.numero_pedido || `OB-${String(pedido.id).padStart(4, "0")}`,
        horaRecogida: pedido.hora_recogida ?? undefined,
        tipoEntrega: pedido.tipo_entrega,
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
    if (dbEstado === "en_camino") {
      dataToUpdate.fecha_salida_reparto = new Date();
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

    // Envío automático al pasar a 'en_camino' para pedidos a domicilio
    if (dbEstado === "en_camino" && pedido.cliente_email) {
      sendOrderInDeliveryEmail(pedido.cliente_email, {
        nombre: pedido.cliente_nombre,
        orderNumber: pedido.numero_pedido || `OB-${String(pedido.id).padStart(4, "0")}`,
        direccionEntrega: pedido.direccion_entrega,
        direccionDetalles: pedido.direccion_detalles,
        codigoPostal: pedido.codigo_postal,
        repartidorNombre: pedido.repartidor_nombre,
        metodoPago: pedido.metodo_pago,
        estadoPago: pedido.estado_pago,
        total: Number(pedido.total),
        lang: "es",
      }).catch((err) => console.error("Error enviando email en_camino:", err));
    }

    return Response.json(pedido);
  } catch (e) {
    console.error("[pedidos/id]", e);
    return Response.json({ error: "Error al actualizar pedido" }, { status: 500 });
  }
}
