import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

async function getCredentials() {
  let from = process.env.EMAIL_FROM;
  let pass = process.env.EMAIL_PASSWORD;
  if (!from || !pass) {
    try {
      const row = await prisma.configuracion.findUnique({ where: { clave: "email_config" } });
      if (row) {
        const cfg = JSON.parse(row.valor);
        if (!from) from = cfg.from;
        if (!pass) pass = cfg.password;
      }
    } catch { /* sin config en BD */ }
  }
  return { from, pass };
}

async function getTransporter() {
  const { from, pass } = await getCredentials();
  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user: from, pass },
    }),
    from: from || "pedidos@obentojapanesefood.es",
  };
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
}) {
  const { transporter, from: emailFrom } = await getTransporter();
  const en = data.lang === "en";
  const html = baseLayout(en ? `
    <h1 style="font-size:24px;color:#4ade80;margin:0 0 10px;">Your order is ready to pick up! 🍣</h1>
    <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hello <strong>${data.nombre}</strong>, our kitchen team has freshly prepared your order.</p>
    <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Order Reference</p>
      <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="font-size:14px;color:#e5e7eb;margin:0;">
        📍 <strong>Pick-up point:</strong> C. Amargura, 3, 30830 La Ñora, Murcia
      </p>
      ${data.horaRecogida ? `<p style="font-size:14px;color:#c9a84c;margin:6px 0 0;">🕐 Scheduled time: <strong>${data.horaRecogida}</strong></p>` : ""}
    </div>
    <p style="font-size:13px;color:#9ca3af;margin-top:24px;">Thank you for choosing OBENTO Japanese Food. Enjoy your meal!</p>
  ` : `
    <h1 style="font-size:24px;color:#4ade80;margin:0 0 10px;">¡Tu pedido ya está listo! 🍣</h1>
    <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hola <strong>${data.nombre}</strong>, nuestro equipo de cocina ya tiene listo tu pedido recién elaborado.</p>
    <div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.3);border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Número de pedido</p>
      <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
    </div>
    <div style="background:rgba(255,255,255,0.03);padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="font-size:14px;color:#e5e7eb;margin:0;">
        📍 <strong>Punto de recogida:</strong> C. Amargura, 3, 30830 La Ñora, Murcia
      </p>
      ${data.horaRecogida ? `<p style="font-size:14px;color:#c9a84c;margin:6px 0 0;">🕐 Hora acordada: <strong>${data.horaRecogida}</strong></p>` : ""}
    </div>
    <p style="font-size:13px;color:#9ca3af;margin-top:24px;">¡Muchas gracias por elegir OBENTO Japanese Food! Que lo disfrutes.</p>
  `);

  try {
    await transporter.sendMail({
      from: `"OBENTO Japanese Food" <${emailFrom}>`,
      to,
      subject: en ? `Your order is ready to pick up! · ${data.orderNumber}` : `¡Tu pedido está listo para recoger! · ${data.orderNumber}`,
      html,
    });
  } catch (err) {
    console.error("[sendOrderReady error]", err);
  }
}

export async function sendOrderPreparing(to: string, data: {
  nombre: string;
  orderNumber: string;
  horaRecogida?: string;
  lang?: string;
}) {
  const { transporter, from: emailFrom } = await getTransporter();
  const en = data.lang === "en";
  const html = baseLayout(en ? `
    <h1 style="font-size:24px;color:#fbbf24;margin:0 0 10px;">Your order is being prepared! 👨‍🍳</h1>
    <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hi ${data.nombre}, our sushiman is preparing your dishes right now.</p>
    <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Order</p>
      <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
    </div>
    <p style="font-size:13px;color:#9ca3af;margin-top:24px;">We will notify you immediately once it's ready.</p>
  ` : `
    <h1 style="font-size:24px;color:#fbbf24;margin:0 0 10px;">¡Tu pedido está en cocina! 👨‍🍳</h1>
    <p style="color:#d1d5db;font-size:15px;margin:0 0 20px;">Hola ${data.nombre}, nuestro sushiman ya está elaborando tus piezas al momento.</p>
    <div style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.15em;">Pedido</p>
      <p style="margin:4px 0 0;font-size:26px;font-weight:800;color:#c9a84c;font-family:monospace;">${data.orderNumber}</p>
    </div>
    <p style="font-size:13px;color:#9ca3af;margin-top:24px;">Te enviaremos otro aviso en cuanto esté listo para recoger.</p>
  `);

  try {
    await transporter.sendMail({
      from: `"OBENTO Japanese Food" <${emailFrom}>`,
      to,
      subject: en ? `Your order is in the kitchen · ${data.orderNumber}` : `Tu pedido está en cocina · ${data.orderNumber}`,
      html,
    });
  } catch (err) {
    console.error("[sendOrderPreparing error]", err);
  }
}
