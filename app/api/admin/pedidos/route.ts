import { prisma } from "@/lib/prisma";
import { getSessionRole, deny403 } from "@/lib/auth";

const DISH_IMAGES: Record<string, string> = {
  e1: "/images/edamame.jpg",
  e2: "/images/gyozaspollo.jpg",
  e3: "/images/gyozasverdura.jpg",
  e4: "/images/gyozaslangostino.jpg",
  e5: "/images/samosas.jpg",
  e6: "/images/takoyaki.jpg",
  e7: "/images/ensaladawakame.jpg",
  e8: "/images/ebifry.jpg",
  n1: "/images/nigiriatun.jpg",
  n2: "/images/nigiriatunfoie.jpg",
  n3: "/images/nigirisalmon.jpg",
  n4: "/images/nigirisalmonf.jpg",
  n5: "/images/nigirichutoro.jpg",
  n6: "/images/nigirivieira.jpg",
  n7: "/images/nigirianguila.jpg",
  n8: "/images/nigirihamachi.jpg",
  n9: "/images/atuntoro.jpg",
  u1: "/images/rolloatun.jpg",
  u2: "/images/uramakisalmon.jpg",
  u3: "/images/uramakipollo.jpg",
  u4: "/images/rollovegetal.jpg",
  u5: "/images/rolloblack.jpg",
  u6: "/images/uramakicangrejo.jpg",
  u7: "/images/rollosalmon1.jpg",
  u8: "/images/rolloatun1.jpg",
  u9: "/images/rollolubina.jpg",
  f1: "/images/futomaki.jpg",
  f2: "/images/rollogamba.jpg",
  f3: "/images/futokara.jpg",
  m1: "/images/maki2.jpg",
  m2: "/images/makichu.jpg",
  m3: "/images/makiatun.jpg",
  m4: "/images/maki4.jpg",
  c3: "/images/arrozternera.jpg",
  c4: "/images/arrozpollo.jpg",
  c5: "/images/yakisobalangostino.jpg",
  c6: "/images/yakisobaternera.jpg",
  c7: "/images/yakisobapollo.jpg",
  p1: "/images/mochifresa.jpg",
  p2: "/images/mochimango.jpg",
  p3: "/images/mochichocolate.jpg",
};

export async function GET() {
  if (!(await getSessionRole())) return deny403();
  try {
    const rows = await prisma.pedidos.findMany({
      include: { pedido_items: true },
      orderBy: { id: "desc" },
    });

    const enriched = rows.map(p => {
      const estadoUI = p.estado_pedido === "recibido" ? "nuevo" : p.estado_pedido;
      const isOnlinePay = p.metodo_pago === "stripe" || p.estado_pago === "pagado";

      const items = p.pedido_items.map(it => ({
        id: it.dish_id,
        name: it.nombre,
        qty: it.cantidad,
        price: Number(it.precio_unitario),
        categoria: it.categoria,
        opcion: it.opcion,
        image: DISH_IMAGES[it.dish_id] ?? "/images/placeholder.jpg",
      }));

      return {
        id: p.id,
        numeroPedido: p.numero_pedido,
        nombre: p.cliente_nombre,
        telefono: p.cliente_telefono,
        email: p.cliente_email,
        tipoEntrega: p.tipo_entrega,
        horaRecogida: p.hora_recogida,
        notas: p.notas,
        metodoPago: isOnlinePay ? "stripe" : "local",
        estadoPago: p.estado_pago,
        estado: estadoUI,
        total: Number(p.total),
        createdAt: p.created_at ? p.created_at.toISOString() : new Date().toISOString(),
        items,
      };
    });

    return Response.json(enriched);
  } catch (e) {
    console.error("[pedidos GET]", e);
    return Response.json([]);
  }
}

export async function POST(req: Request) {
  if (!(await getSessionRole())) return deny403();
  try {
    const data = await req.json();
    const numero_pedido = data.numero_pedido || `OB-${Math.floor(1000 + Math.random() * 9000)}`;

    const p = await prisma.pedidos.create({
      data: {
        numero_pedido,
        cliente_nombre: data.nombre,
        cliente_telefono: data.telefono || "",
        cliente_email: data.email || null,
        tipo_entrega: data.tipoEntrega || "recogida_local",
        hora_recogida: data.horaRecogida || null,
        notas: data.notas || null,
        metodo_pago: data.metodoPago || "restaurante",
        estado_pago: data.estadoPago || "pendiente",
        estado_pedido: "recibido",
        total: data.total,
        pedido_items: {
          create: (data.items || []).map((it: any) => ({
            dish_id: it.id || "dish",
            nombre: it.name,
            precio_unitario: it.price,
            cantidad: it.qty || 1,
            subtotal: (it.price || 0) * (it.qty || 1),
            categoria: it.categoria || null,
            notas: it.notas || null,
          })),
        },
      },
      include: { pedido_items: true },
    });

    return Response.json(p, { status: 201 });
  } catch (e) {
    console.error("[pedidos POST]", e);
    return Response.json({ error: "Error al crear pedido" }, { status: 500 });
  }
}
