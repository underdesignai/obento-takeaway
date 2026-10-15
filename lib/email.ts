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
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `OBENTO Japanese Food <${from}>`,
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
}) {
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
}) {
  const en = data.lang === "en";
  const isDelivery = data.tipoEntrega === "domicilio";
  const trackingUrl = `https://pedidos.obentojapanesefood.es/seguimiento?id=${data.orderNumber}`;

  let contentHtml = "";

  if (isDelivery) {
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
