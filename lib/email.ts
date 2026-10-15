import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

async function getCredentials() {
  let from = process.env.EMAIL_FROM || "pedidos@obentojapanesefood.es";
  let pass = process.env.EMAIL_PASSWORD;
  let resendKey = process.env.RESEND_API_KEY;
  if (!pass && !resendKey) {
    try {
      const row = await prisma.configuracion.findUnique({ where: { clave: "email_config" } });
      if (row) {
        const cfg = JSON.parse(row.valor);
        if (cfg.from) from = cfg.from;
        if (cfg.password) pass = cfg.password;
        if (cfg.resend_key) resendKey = cfg.resend_key;
      }
    } catch { /* sin config en BD */ }
  }
  return { from, pass, resendKey };
}

async function sendEmailTransport(to: string, subject: string, html: string) {
  const { from, pass, resendKey } = await getCredentials();

  // 1. Resend API prioritario
  if (resendKey) {
    const cleanFrom = from.includes("<") ? from : `OBENTO Japanese Food <${from}>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: cleanFrom,
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(`Resend API error (${res.status}): ${JSON.stringify(errJson)}`);
    }
    return;
  }

  // 2. Nodemailer SMTP / Gmail
  if (pass) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: from, pass },
    });
    await transporter.sendMail({
      from: `"OBENTO Japanese Food" <${from}>`,
      to,
      subject,
      html,
    });
    return;
  }

  throw new Error("No hay credenciales de email configuradas (falta RESEND_API_KEY o EMAIL_PASSWORD)");
}

type OrderItem = { name: string; nameEn?: string; qty: number; price: number };

function itemsHtml(items: OrderItem[], lang: string) {
  return items
    .map(
      (i) => `
    <tr>
      <td style="padding:8px 0;color:#333;font-size:14px;">${i.qty}× ${lang === "en" && i.nameEn ? i.nameEn : i.name}</td>
      <td style="padding:8px 0;color:#333;font-size:14px;text-align:right;">${(i.qty * i.price).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
    </tr>`
    )
    .join("");
}

function baseLayout(content: string) {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:0;background:#0d0d12;font-family:system-ui,-apple-system,sans-serif;">
    <div style="max-width:560px;margin:30px auto;background:#15151c;border-radius:12px;overflow:hidden;border:1px solid rgba(201,168,76,0.3);box-shadow:0 12px 30px rgba(0,0,0,0.5);">
      <div style="background:#0a0a0f;padding:24px 32px;display:flex;align-items:center;border-bottom:1px solid rgba(201,168,76,0.2);">
        <span style="font-size:22px;font-weight:700;color:#c9a84c;letter-spacing:0.15em;">OBENTO</span>
        <span style="margin-left:10px;font-size:11px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.2em;">Japanese Food · La Ñora</span>
      </div>
      <div style="padding:32px;color:#e5e7eb;">
        ${content}
      </div>
      <div style="background:#0e0e14;padding:16px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
        <p style="font-size:11px;color:#9ca3af;margin:0;letter-spacing:0.1em;">
          C. Amargura, 3 · 30830 La Ñora, Murcia · Tel. 613 927 596 · obentojapanesefood.es
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

export async function sendOrderReady(to: string, data: {
  nombre: string;
  orderNumber: string;
  horaRecogida?: string;
  lang?: string;
  isPagado?: boolean;
  total?: number;
  tipoEntrega?: string | null;
}) {
  if (data.tipoEntrega === "domicilio" || data.tipoEntrega === "delivery") {
    console.warn(`[sendOrderReady] Omitido: el pedido ${data.orderNumber} es a domicilio.`);
    return;
  }
  const en = data.lang === "en";
  const trackingUrl = `https://pedidos.obentojapanesefood.es/seguimiento?id=${data.orderNumber}`;
  const totalFormatted = data.total != null ? data.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const paymentNoticeHtml = !data.isPagado && data.total != null ? (en ? `
    <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.35);padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="font-size:14px;color:#fbbf24;margin:0;font-weight:700;">
        💵 Total due on pick-up: ${totalFormatted} €
      </p>
      <p style="font-size:12px;color:#d1d5db;margin:4px 0 0;">
        Payment will be settled at the counter (cash or card).
      </p>
    </div>
  ` : `
    <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.35);padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="font-size:14px;color:#fbbf24;margin:0;font-weight:700;">
        💵 Importe a abonar al recoger: ${totalFormatted} €
      </p>
      <p style="font-size:12px;color:#d1d5db;margin:4px 0 0;">
        El importe total de <strong>${totalFormatted} €</strong> se abonará al recoger tu pedido en el local (en efectivo o tarjeta).
      </p>
    </div>
  `) : "";

  const html = baseLayout(en ? `
    <h1 style="font-size:24px;color:#4ade80;margin:0 0 10px;">Your order is ready to pick up! 🍣</h1>
    <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hello <strong>${data.nombre}</strong>, our kitchen team has freshly prepared your order.</p>
    <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Order Reference</p>
      <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="font-size:14px;color:#e5e7eb;margin:0;">
        📍 <strong>Pick-up point:</strong> C. Amargura, 3, 30830 La Ñora, Murcia
      </p>
      ${data.horaRecogida ? `<p style="font-size:14px;color:#c9a84c;margin:6px 0 0;">🕐 Scheduled time: <strong>${data.horaRecogida}</strong></p>` : ""}
    </div>
    ${paymentNoticeHtml}
    <div style="text-align:center;margin:24px 0;">
      <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:13px 26px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
        🔴 Track Order Live →
      </a>
    </div>
    <p style="font-size:13px;color:#9ca3af;margin-top:20px;">Thank you for choosing OBENTO Japanese Food. Enjoy your meal!</p>
  ` : `
    <h1 style="font-size:24px;color:#4ade80;margin:0 0 10px;">¡Tu pedido ya está listo! 🍣</h1>
    <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hola <strong>${data.nombre}</strong>, nuestro equipo de cocina ya tiene listo tu pedido recién elaborado.</p>
    <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Número de pedido</p>
      <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="font-size:14px;color:#e5e7eb;margin:0;">
        📍 <strong>Punto de recogida:</strong> C. Amargura, 3, 30830 La Ñora, Murcia
      </p>
      ${data.horaRecogida ? `<p style="font-size:14px;color:#c9a84c;margin:6px 0 0;">🕐 Hora acordada: <strong>${data.horaRecogida}</strong></p>` : ""}
    </div>
    ${paymentNoticeHtml}
    <div style="text-align:center;margin:24px 0;">
      <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:13px 26px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
        🔴 Ver Estado en Directo →
      </a>
    </div>
    <p style="font-size:13px;color:#9ca3af;margin-top:20px;">¡Muchas gracias por elegir OBENTO Japanese Food! Que lo disfrutes.</p>
  `);

  try {
    const subject = en ? `Your order is ready to pick up! · ${data.orderNumber}` : `¡Tu pedido está listo para recoger! · ${data.orderNumber}`;
    await sendEmailTransport(to, subject, html);
    console.log(`✉️ Email de pedido listo enviado a ${to} (${data.orderNumber})`);
  } catch (err) {
    console.error("[sendOrderReady error]", err);
  }
}

export async function sendOrderPreparing(to: string, data: {
  nombre: string;
  orderNumber: string;
  horaRecogida?: string;
  lang?: string;
  tipoEntrega?: string | null;
  direccionEntrega?: string | null;
  direccionDetalles?: string | null;
  metodoPago?: string;
  estadoPago?: string;
  total?: number;
}) {
  const en = data.lang === "en";
  const isDelivery = data.tipoEntrega === "domicilio";
  const isPendingPayment = !(data.metodoPago === "stripe" || data.estadoPago === "pagado");
  const totalFormatted = data.total != null ? data.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const trackingUrl = `https://pedidos.obentojapanesefood.es/seguimiento?id=${data.orderNumber}`;

  let contentHtml = "";

  if (isDelivery) {
    const paymentNotice = isPendingPayment && data.total != null ? (en ? `
      <div style="background:rgba(251,191,36,0.12);border:2px solid #fbbf24;border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <div style="display:inline-block;padding:4px 12px;border-radius:14px;background:#fbbf24;color:#0d0d12;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">
          💵 PAYMENT DUE ON DELIVERY
        </div>
        <div style="font-size:13px;color:#d1d5db;margin-bottom:4px;">Amount to pay to the rider upon delivery:</div>
        <div style="font-size:28px;font-weight:900;color:#fbbf24;font-family:monospace;letter-spacing:0.04em;line-height:1.1;">
          ${totalFormatted} €
        </div>
        <div style="font-size:13px;color:#f3ede0;font-weight:700;margin-top:8px;">
          You can pay in <span style="color:#fbbf24;">CASH</span> or by <span style="color:#fbbf24;">CARD</span> (terminal) directly to the delivery rider.
        </div>
      </div>
    ` : `
      <div style="background:rgba(251,191,36,0.12);border:2px solid #fbbf24;border-radius:10px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <div style="display:inline-block;padding:4px 12px;border-radius:14px;background:#fbbf24;color:#0d0d12;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">
          💵 PAGO PENDIENTE AL REPARTIDOR
        </div>
        <div style="font-size:13px;color:#d1d5db;margin-bottom:4px;">Importe a abonar al repartidor a la entrega:</div>
        <div style="font-size:28px;font-weight:900;color:#fbbf24;font-family:monospace;letter-spacing:0.04em;line-height:1.1;">
          ${totalFormatted} €
        </div>
        <div style="font-size:13px;color:#f3ede0;font-weight:700;margin-top:8px;">
          Puedes pagar en <span style="color:#fbbf24;">EFECTIVO</span> o con <span style="color:#fbbf24;">TARJETA</span> (datáfono) directamente al repartidor.
        </div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">
          Por favor ten preparado el importe exacto o tu tarjeta para agilizar la entrega.
        </div>
      </div>
    `) : "";

    contentHtml = en ? `
      <div style="display:inline-block;padding:5px 12px;border-radius:20px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35);color:#fbbf24;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;">
        👨‍🍳 IN THE KITCHEN · HOME DELIVERY
      </div>
      <h1 style="font-size:24px;color:#fbbf24;margin:0 0 10px;">Your delivery order is being prepared! 👨‍🍳</h1>
      <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hi <strong>${data.nombre}</strong>, our sushiman is crafting your sushi fresh right now.</p>
      
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Order Reference</p>
        <p style="margin:4px 0 10px;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;font-size:13px;color:#e5e7eb;">
          📍 <strong>Delivery address:</strong> ${data.direccionEntrega || "Your address"}
          ${data.direccionDetalles ? `<br/><span style="color:#9ca3af;font-size:12px;">(${data.direccionDetalles})</span>` : ""}
        </div>
      </div>

      ${paymentNotice}

      <div style="text-align:center;margin:24px 0;">
        <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:13px 26px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
          🔴 Track Order Live →
        </a>
      </div>
      <p style="font-size:13px;color:#9ca3af;margin-top:20px;">As soon as it is packed, our delivery rider will pick it up and you will receive an email letting you know they are on their way!</p>
    ` : `
      <div style="display:inline-block;padding:5px 12px;border-radius:20px;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.35);color:#fbbf24;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px;">
        👨‍🍳 EN COCINA · ENTREGA A DOMICILIO
      </div>
      <h1 style="font-size:24px;color:#fbbf24;margin:0 0 10px;">¡Tu pedido a domicilio está en marcha! 👨‍🍳</h1>
      <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hola <strong>${data.nombre}</strong>, nuestro sushiman ya está elaborando tus piezas al momento con ingredientes frescos.</p>
      
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Número de pedido</p>
        <p style="margin:4px 0 10px;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;font-size:13px;color:#e5e7eb;line-height:1.4;">
          📍 <strong>Dirección de entrega:</strong><br/>
          <span style="color:#cbd5e1;font-weight:600;">${data.direccionEntrega || "Dirección indicada en el pedido"}</span>
          ${data.direccionDetalles ? `<br/><span style="color:#9ca3af;font-size:12px;">(${data.direccionDetalles})</span>` : ""}
        </div>
      </div>

      ${paymentNotice}

      <div style="text-align:center;margin:24px 0;">
        <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:13px 26px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
          🔴 Ver Estado en Directo →
        </a>
      </div>
      <p style="font-size:13px;color:#9ca3af;margin-top:20px;">En cuanto el pedido esté empaquetado y el repartidor coja la bolsa térmica, recibirás un correo avisándote de que va de camino a tu puerta.</p>
    `;
  } else {
    // Recogida en local (Takeaway)
    contentHtml = en ? `
      <h1 style="font-size:24px;color:#fbbf24;margin:0 0 10px;">Your order is being prepared! 👨‍🍳</h1>
      <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hi <strong>${data.nombre}</strong>, our sushiman is preparing your dishes right now.</p>
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Order</p>
        <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:13px 26px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
          🔴 Track Order Live →
        </a>
      </div>
      <p style="font-size:13px;color:#9ca3af;margin-top:20px;">We will notify you immediately once it's ready.</p>
    ` : `
      <h1 style="font-size:24px;color:#fbbf24;margin:0 0 10px;">¡Tu pedido está en cocina! 👨‍🍳</h1>
      <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hola <strong>${data.nombre}</strong>, nuestro sushiman ya está elaborando tus piezas al momento.</p>
      <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:14px 18px;margin-bottom:20px;">
        <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Pedido</p>
        <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:13px 26px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
          🔴 Ver Estado en Directo →
        </a>
      </div>
      <p style="font-size:13px;color:#9ca3af;margin-top:20px;">Te enviaremos otro aviso en cuanto esté listo para recoger.</p>
    `;
  }

  const html = baseLayout(contentHtml);

  try {
    let subject = "";
    if (isDelivery) {
      subject = en ? `Your delivery order is in the kitchen · ${data.orderNumber}` : `¡Tu pedido a domicilio está en cocina! 👨‍🍳 · ${data.orderNumber}`;
    } else {
      subject = en ? `Your order is in the kitchen · ${data.orderNumber}` : `Tu pedido está en cocina · ${data.orderNumber}`;
    }
    await sendEmailTransport(to, subject, html);
    console.log(`✉️ Email de pedido en cocina enviado a ${to} (${data.orderNumber})`);
  } catch (err) {
    console.error("[sendOrderPreparing error]", err);
  }
}

export async function sendOrderInDeliveryEmail(to: string, data: {
  nombre: string;
  orderNumber: string;
  direccionEntrega?: string | null;
  direccionDetalles?: string | null;
  codigoPostal?: string | null;
  repartidorNombre?: string | null;
  metodoPago?: string;
  estadoPago?: string;
  total?: number;
  items?: any[];
  lang?: string;
}) {
  if (!to) return;
  const en = data.lang === "en";
  const isOnlinePay = data.metodoPago === "stripe" || data.estadoPago === "pagado";
  const isPendingPayment = !isOnlinePay;
  const rider = data.repartidorNombre ? data.repartidorNombre : (en ? "Our delivery rider" : "Nuestro repartidor");
  const trackingUrl = `https://pedidos.obentojapanesefood.es/seguimiento?id=${data.orderNumber}`;
  const totalFormatted = data.total != null ? data.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const paymentNoticeHtml = isPendingPayment ? (en ? `
    <div style="background:rgba(251,191,36,0.12);border:2px solid #fbbf24;border-radius:12px;padding:20px 22px;margin-bottom:24px;text-align:center;">
      <div style="display:inline-block;padding:4px 12px;border-radius:14px;background:#fbbf24;color:#0d0d12;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">
        💵 PENDING PAYMENT TO RIDER
      </div>
      <div style="font-size:13px;color:#d1d5db;margin-bottom:4px;">
        Total amount due to the delivery rider:
      </div>
      <div style="font-size:32px;font-weight:900;color:#fbbf24;font-family:monospace;letter-spacing:0.04em;line-height:1.1;">
        ${totalFormatted} €
      </div>
      <div style="font-size:14px;color:#f3ede0;font-weight:700;margin-top:12px;line-height:1.4;">
        You can pay in <span style="color:#fbbf24;">CASH</span> or by <span style="color:#fbbf24;">CARD</span> (terminal) directly to the rider.
      </div>
      <div style="font-size:12px;color:#9ca3af;margin-top:6px;">
        Please have the exact amount or your card ready at the door.
      </div>
    </div>
  ` : `
    <div style="background:rgba(251,191,36,0.12);border:2px solid #fbbf24;border-radius:12px;padding:20px 22px;margin-bottom:24px;text-align:center;">
      <div style="display:inline-block;padding:4px 12px;border-radius:14px;background:#fbbf24;color:#0d0d12;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">
        💵 PAGO PENDIENTE AL REPARTIDOR
      </div>
      <div style="font-size:13px;color:#d1d5db;margin-bottom:4px;">
        Importe total a abonar al repartidor:
      </div>
      <div style="font-size:32px;font-weight:900;color:#fbbf24;font-family:monospace;letter-spacing:0.04em;line-height:1.1;">
        ${totalFormatted} €
      </div>
      <div style="font-size:14px;color:#f3ede0;font-weight:700;margin-top:12px;line-height:1.4;">
        Puedes pagar en <span style="color:#fbbf24;">EFECTIVO</span> o con <span style="color:#fbbf24;">TARJETA</span> (datáfono) directamente al repartidor.
      </div>
      <div style="font-size:12px;color:#9ca3af;margin-top:6px;">
        Por favor ten preparado el importe exacto o tu tarjeta para agilizar la entrega en tu puerta.
      </div>
    </div>
  `) : (en ? `
    <div style="background:rgba(34,197,94,0.1);border:1.5px solid rgba(34,197,94,0.35);border-radius:10px;padding:16px 20px;margin-bottom:22px;text-align:center;">
      <div style="font-size:13px;font-weight:800;color:#4ade80;margin-bottom:4px;">
        ✓ ORDER PAID ONLINE WITH CARD
      </div>
      <div style="font-size:13px;color:#d1d5db;margin-top:2px;">
        You don't need to pay anything to the rider. Just receive and enjoy!
      </div>
    </div>
  ` : `
    <div style="background:rgba(34,197,94,0.1);border:1.5px solid rgba(34,197,94,0.35);border-radius:10px;padding:16px 20px;margin-bottom:22px;text-align:center;">
      <div style="font-size:13px;font-weight:800;color:#4ade80;margin-bottom:4px;">
        ✓ PEDIDO PAGADO ONLINE CON TARJETA
      </div>
      <div style="font-size:13px;color:#d1d5db;margin-top:2px;">
        No tienes que abonar nada al repartidor. Solo recoger tu pedido y disfrutar.
      </div>
    </div>
  `);

  const contentHtml = en ? `
    <div style="display:inline-block;padding:6px 14px;border-radius:20px;background:rgba(192,132,252,0.15);border:1.5px solid rgba(192,132,252,0.4);color:#c084fc;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">
      🛵 ORDER ON ITS WAY!
    </div>
    <h1 style="font-size:24px;color:#f3ede0;margin:0 0 10px;font-weight:900;line-height:1.2;">
      Your food is on its way to your door! 🍣💨
    </h1>
    <p style="color:#d1d5db;font-size:15px;line-height:1.5;margin:0 0 20px;">
      Hi <strong>${data.nombre}</strong>, <strong>${rider}</strong> has just departed from our restaurant with your freshly made order packed in thermal bags to ensure it arrives hot and perfect.
    </p>
    <div style="background:rgba(200,30,34,0.08);border:1px solid rgba(200,30,34,0.3);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">ORDER REFERENCE</span>
        <span style="font-family:monospace;font-size:24px;font-weight:900;color:#c81e22;">${data.orderNumber}</span>
      </div>
      <div style="font-size:14px;color:#f3ede0;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;margin-top:6px;line-height:1.4;">
        📍 <strong>Delivery address:</strong><br/>
        <span style="color:#cbd5e1;font-weight:600;">${data.direccionEntrega || "Delivery address"}</span>
        ${data.direccionDetalles ? `<br/><span style="color:#9ca3af;font-size:12px;">(${data.direccionDetalles})</span>` : ""}
        ${data.codigoPostal ? `<br/><span style="color:#9ca3af;font-size:12px;">ZIP ${data.codigoPostal}</span>` : ""}
      </div>
      <div style="font-size:13px;color:#d1d5db;margin-top:10px;">
        ⏱️ <strong>Estimated arrival:</strong> <span style="color:#4ade80;font-weight:bold;">15 - 25 minutes approx.</span>
      </div>
    </div>
    ${paymentNoticeHtml}
    <div style="text-align:center;margin:24px 0 20px;">
      <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:14px 28px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
        🔴 Track Order Live →
      </a>
    </div>
    ${data.total != null ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0 0;border-top:2px solid rgba(255,255,255,0.1);margin-bottom:20px;">
      <span style="font-size:15px;font-weight:700;color:#f3ede0;">${isPendingPayment ? "Total due to rider:" : "Order total:"}</span>
      <span style="font-size:22px;font-weight:900;color:${isPendingPayment ? "#fbbf24" : "#c81e22"};font-family:monospace;">${totalFormatted} €</span>
    </div>
    ` : ""}
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:20px 0 0;">
      Enjoy your meal! 🥢
    </p>
  ` : `
    <div style="display:inline-block;padding:6px 14px;border-radius:20px;background:rgba(192,132,252,0.15);border:1.5px solid rgba(192,132,252,0.4);color:#c084fc;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px;">
      🛵 ¡PEDIDO EN CAMINO!
    </div>
    <h1 style="font-size:24px;color:#f3ede0;margin:0 0 10px;font-weight:900;line-height:1.2;">
      ¡Tu comida va en camino a tu puerta! 🍣💨
    </h1>
    <p style="color:#d1d5db;font-size:15px;line-height:1.5;margin:0 0 20px;">
      Hola <strong>${data.nombre}</strong>, te informamos de que <strong>${rider}</strong> acaba de salir de nuestro restaurante con tu pedido recién elaborado y empaquetado térmicamente para que llegue perfecto a tu domicilio.
    </p>
    <div style="background:rgba(200,30,34,0.08);border:1px solid rgba(200,30,34,0.3);border-radius:10px;padding:18px 20px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">NÚMERO DE PEDIDO</span>
        <span style="font-family:monospace;font-size:24px;font-weight:900;color:#c81e22;">${data.orderNumber}</span>
      </div>
      <div style="font-size:14px;color:#f3ede0;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;margin-top:6px;line-height:1.4;">
        📍 <strong>Dirección de entrega:</strong><br/>
        <span style="color:#cbd5e1;font-weight:600;">${data.direccionEntrega || "Dirección indicada en el pedido"}</span>
        ${data.direccionDetalles ? `<br/><span style="color:#9ca3af;font-size:12px;">(${data.direccionDetalles})</span>` : ""}
        ${data.codigoPostal ? `<br/><span style="color:#9ca3af;font-size:12px;">C.P. ${data.codigoPostal}</span>` : ""}
      </div>
      <div style="font-size:13px;color:#d1d5db;margin-top:10px;">
        ⏱️ <strong>Tiempo estimado de llegada:</strong> <span style="color:#4ade80;font-weight:bold;">15 - 25 minutos aprox.</span>
      </div>
    </div>
    ${paymentNoticeHtml}
    <div style="text-align:center;margin:24px 0 20px;">
      <a href="${trackingUrl}" target="_blank" style="display:inline-block;padding:14px 28px;border-radius:8px;background:linear-gradient(135deg, #c81e22 0%, #99151b 100%);color:#ffffff;text-decoration:none;font-weight:800;font-size:14px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 18px rgba(200,30,34,0.4);">
        🔴 Seguir Estado del Pedido en Directo →
      </a>
    </div>
    ${data.total != null ? `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 0 0;border-top:2px solid rgba(255,255,255,0.1);margin-bottom:20px;">
      <span style="font-size:15px;font-weight:700;color:#f3ede0;">${isPendingPayment ? "Total a abonar al repartidor:" : "Total del pedido:"}</span>
      <span style="font-size:22px;font-weight:900;color:${isPendingPayment ? "#fbbf24" : "#c81e22"};font-family:monospace;">${totalFormatted} €</span>
    </div>
    ` : ""}
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:20px 0 0;">
      El repartidor se pondrá en contacto al llegar si tiene cualquier duda con el portal o timbre.<br/>
      ¡Buen provecho! 🥢
    </p>
  `;

  const html = baseLayout(contentHtml);

  try {
    const subject = isPendingPayment && data.total != null
      ? (en
          ? `🛵 Your order is on its way! · Pay ${totalFormatted} € to rider (cash or card) · ${data.orderNumber} · OBENTO`
          : `🛵 ¡Tu pedido va de camino! · Abonar ${totalFormatted} € al repartidor (efectivo o tarjeta) · ${data.orderNumber} · OBENTO`)
      : (en
          ? `🛵 Your order is on its way to your door! · ${data.orderNumber} · OBENTO`
          : `🛵 ¡Tu pedido va de camino a tu puerta! · ${data.orderNumber} · OBENTO`);

    await sendEmailTransport(to, subject, html);
    console.log(`✉️ Email de salida a reparto enviado con éxito a ${to} (${data.orderNumber})`);
  } catch (err: any) {
    console.error(`⚠️ Error enviando email de salida a reparto:`, err);
  }
}

