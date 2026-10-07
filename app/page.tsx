"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, LogOut } from "lucide-react";
import { MonitorLanguageProvider, useMonitorLanguage } from "@/lib/LanguageContext";
import AuthGate from "@/components/AuthGate";
import LanguageSelector from "@/components/LanguageSelector";

type SaturacionState = {
  modo: "activo" | "limitado";
  hasta: string | null;
  tipo: string | null;
  por: string | null;
  umbralPedidos: string;
  umbralMinutos: string;
  manualOverride: boolean;
};

type PedidoDB = {
  id: number;
  numeroPedido?: string;
  nombre: string;
  telefono?: string | null;
  horaRecogida?: string | null;
  tipoEntrega?: string | null;
  direccionEntrega?: string | null;
  direccionDetalles?: string | null;
  codigoPostal?: string | null;
  repartidorNombre?: string | null;
  items: { id: string; name: string; nameEn?: string; qty: number; price: number; categoria?: string; image?: string }[];
  total: number;
  estado: string;
  createdAt: string;
  email?: string | null;
  notas?: string | null;
  metodoPago?: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function extractTimeStr(horaRecogida: string): string {
  if (!horaRecogida) return "";
  const cleaned = horaRecogida.replace(/[^0-9:]/g, "");
  if (cleaned.includes(":")) {
    const [hh, mm] = cleaned.split(":");
    return `${hh.padStart(2, "0")}:${mm.substring(0, 2)}`;
  }
  return horaRecogida;
}

function parseHoraMin(horaRecogida: string): number {
  const [hh, mm] = extractTimeStr(horaRecogida).split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

function formatHora(horaRecogida: string): string {
  return extractTimeStr(horaRecogida);
}

function sortByProximity(lista: PedidoDB[]): PedidoDB[] {
  return [...lista].sort((a, b) => {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const minsA = a.horaRecogida ? parseHoraMin(a.horaRecogida) : null;
    const minsB = b.horaRecogida ? parseHoraMin(b.horaRecogida) : null;
    if (minsA === null && minsB === null) return 0;
    if (minsA === null) return 1;
    if (minsB === null) return -1;
    const futA = minsA >= nowMins;
    const futB = minsB >= nowMins;
    if (futA && futB) return minsA - minsB;
    if (!futA && !futB) return minsB - minsA;
    return futA ? -1 : 1;
  });
}

async function fetchIva(): Promise<number> {
  try {
    const res = await fetch("/api/admin/configuracion/takeaway");
    if (!res.ok) return 10;
    const data = await res.json();
    return parseFloat(data.takeaway_iva ?? "10") || 10;
  } catch {
    return 10;
  }
}

async function printTicket(p: PedidoDB) {
  const iva = await fetchIva();
  const isPagado = p.metodoPago !== "local" && p.metodoPago !== "restaurante";
  const orderNum = p.numeroPedido || `OB-${String(p.id).padStart(4, "0")}`;
  const hora = p.horaRecogida ? formatHora(p.horaRecogida) : null;
  const baseImponible = p.total / (1 + iva / 100);
  const ivaAmount = p.total - baseImponible;
  const win = window.open("", "_blank", "width=420,height=680");
  if (!win) return;
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Ticket ${orderNum}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Courier New',Courier,monospace;font-size:13px;background:#fff;color:#000;max-width:340px;margin:0 auto;padding:12px;}
  .logo{text-align:center;padding:10px 0;}
  .logo h1{font-size:22px;letter-spacing:3px;font-weight:900;}
  .logo p{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#444;}
  .logo-divider{border:none;border-top:2px dashed #000;margin:10px 0;}
  .priority{padding:10px 0;text-align:center;border-bottom:1px dashed #000;}
  .order-num{font-size:30px;font-weight:900;letter-spacing:1px;line-height:1;}
  .order-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:4px;}
  .nombre{font-size:16px;font-weight:700;margin:6px 0 10px;}
  .hora-block{display:inline-block;background:#000;color:#fff;padding:6px 16px;border-radius:4px;margin-bottom:8px;}
  .hora-label-sm{font-size:9px;text-transform:uppercase;letter-spacing:1px;opacity:0.8;display:block;}
  .hora-val{font-size:28px;font-weight:900;line-height:1.1;}
  .pago{display:inline-block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:3px 12px;border-radius:14px;border:1.5px solid #000;margin-top:4px;}
  .notas-block{padding:10px 0;border-bottom:1px dashed #000;}
  .section-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#666;margin-bottom:4px;}
  .notas-text{font-size:13px;color:#000;line-height:1.4;font-weight:bold;}
  .notas-empty{font-size:12px;color:#888;font-style:italic;}
  .items-block{padding:10px 0;border-bottom:1px dashed #000;}
  .item{display:flex;justify-content:space-between;padding:3px 0;font-size:13px;}
  .item-qty{font-weight:900;margin-right:6px;}
  .item-price{color:#333;font-weight:700;}
  .totals-block{padding:10px 0;}
  .subtotal-row{display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:3px;}
  .iva-row{display:flex;justify-content:space-between;font-size:12px;color:#555;margin-bottom:6px;}
  .total-row{display:flex;justify-content:space-between;align-items:baseline;border-top:2px solid #000;padding-top:8px;}
  .total-label{font-size:13px;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;}
  .total-val{font-size:22px;font-weight:900;}
  .footer{padding:12px 0;text-align:center;border-top:1px dashed #000;margin-top:10px;}
  .footer-name{font-size:13px;font-weight:900;}
  .footer-sub{font-size:11px;color:#444;margin-top:3px;}
</style>
</head><body>
<div class="logo">
  <h1>OBENTO</h1>
  <p>JAPANESE FOOD · KITCHEN KDS</p>
</div>
<hr class="logo-divider">
<div class="priority">
  <div class="order-label">PEDIDO TAKE AWAY</div>
  <div class="order-num">${orderNum}</div>
  <div class="nombre">${p.nombre}</div>
  ${p.telefono ? `<div style="font-size:12px;margin-bottom:6px;">Tel: ${p.telefono}</div>` : ""}
  ${hora ? `<div class="hora-block"><span class="hora-label-sm">Hora de Recogida</span><span class="hora-val">${hora}</span></div>` : ""}
  <br>
  <div class="pago">${isPagado ? "✓ PAGADO ONLINE" : "💵 PAGO EN CAJA"}</div>
</div>
<div class="notas-block">
  <div class="section-label">Notas de Cocina:</div>
  ${p.notas ? `<div class="notas-text">⚠️ ${p.notas}</div>` : `<div class="notas-empty">Sin notas especiales</div>`}
</div>
<div class="items-block">
  <div class="section-label">Platos solicitados:</div>
  ${p.items.map(i => `<div class="item"><span><span class="item-qty">${i.qty}×</span>${i.name}</span><span class="item-price">${(i.qty * i.price).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></div>`).join("")}
</div>
<div class="totals-block">
  <div class="subtotal-row"><span>Base Imponible</span><span>${baseImponible.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></div>
  <div class="iva-row"><span>IVA (${iva}%)</span><span>${ivaAmount.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span></div>
  <div class="total-row">
    <span class="total-label">TOTAL</span>
    <span class="total-val">${p.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
  </div>
</div>
<div class="footer">
  <div class="footer-name">OBENTO JAPANESE FOOD</div>
  <div class="footer-sub">C. Amargura, 3 · 30830 La Ñora, Murcia</div>
  <div class="footer-sub">Tel: 613 927 596 · obentojapanesefood.es</div>
</div>
<script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}<\/script>
</body></html>`);
  win.document.close();
}

// ── Countdown Timer ──────────────────────────────────────────────────────────

function Countdown({ horaRecogida, stopped, lang }: { horaRecogida: string; stopped: boolean; lang: string }) {
  const [display, setDisplay] = useState({ hours: 0, mins: 0, secs: 0, negative: false });

  useEffect(() => {
    if (stopped) {
      setDisplay({ hours: 0, mins: 0, secs: 0, negative: false });
      return;
    }
    const tick = () => {
      const now = new Date();
      const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const targetMins = parseHoraMin(horaRecogida);
      const targetSecs = targetMins * 60;
      const diffSecs = targetSecs - nowSecs;
      const negative = diffSecs < 0;
      const abs = Math.abs(diffSecs);
      setDisplay({
        hours: Math.floor(abs / 3600),
        mins: Math.floor((abs % 3600) / 60),
        secs: abs % 60,
        negative,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [horaRecogida, stopped]);

  const { hours, mins, secs, negative } = display;
  const totalMins = hours * 60 + mins + secs / 60;
  let color = "#60a5fa";
  if (stopped) color = "#4ade80";
  else if (negative) color = "#ef4444";
  else if (totalMins <= 5) color = "#f59e0b";
  else if (totalMins <= 20) color = "#f97316";

  const sign = negative && !stopped ? "-" : "";
  const timeStr = hours > 0
    ? `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${sign}${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div style={{ textAlign: "center", minWidth: 90 }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>
        {stopped ? (lang === "en" ? "Ready" : "Listo") : negative ? (lang === "en" ? "Delayed" : "Retrasado") : (lang === "en" ? "Left" : "Quedan")}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: hours > 0 ? 20 : 25, fontWeight: 700, color, letterSpacing: "0.03em", lineHeight: 1 }}>
        {timeStr}
      </div>
    </div>
  );
}

// ── LiveClock & LiveDate ──────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const t = () => setTime(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    t();
    const id = setInterval(t, 1000);
    return () => clearInterval(id);
  }, []);
  return <>{time}</>;
}

function LiveDate({ lang }: { lang: string }) {
  const d = new Date();
  return <>{d.toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { weekday: "short", day: "numeric", month: "short" })}</>;
}

// ── OrderDetailPopup ──────────────────────────────────────────────────────────

function OrderDetailPopup({ p, lang, onClose }: { p: PedidoDB; lang: string; onClose: () => void }) {
  const isPagado = p.metodoPago !== "local" && p.metodoPago !== "restaurante";
  const hora = p.horaRecogida ? formatHora(p.horaRecogida) : null;
  const orderNum = p.numeroPedido || `OB-${String(p.id).padStart(4, "0")}`;
  const estadoColors: Record<string, string> = {
    nuevo: "#60a5fa",
    preparando: "#f97316",
    listo: "#4ade80",
    entregado: "#9ca3af",
  };
  const color = estadoColors[p.estado] ?? "#fff";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0e0d0b", border: "1px solid rgba(200,30,34,0.3)", borderRadius: 16, width: "100%", maxWidth: 840, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.9), 0 0 30px rgba(200,30,34,0.06)" }}>

        {/* Header modal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: 13, fontFamily: "monospace", color: "#c81e22", fontWeight: 700 }}>{orderNum}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 6, background: `${color}18`, color, border: `1px solid ${color}40` }}>{p.estado}</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 6,
              background: isPagado ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)",
              color: isPagado ? "#4ade80" : "#fbbf24",
              border: `1px solid ${isPagado ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}` }}>
              {isPagado ? (lang === "en" ? "✓ Paid Online" : "✓ Pagado Online") : (lang === "en" ? "💵 Pay on Pickup" : "💵 Pago en Caja")}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Body grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", overflow: "hidden", flex: 1 }}>

          {/* Izquierda: Cliente, Hora, Notas */}
          <div style={{ padding: "1.5rem", borderRight: "1px solid rgba(255,255,255,0.08)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em" }}>Cliente</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#f3ede0", lineHeight: 1.2, marginTop: 2 }}>{p.nombre}</div>
              {p.telefono && <div style={{ fontSize: 13, color: "#a89f8d", marginTop: 4 }}>📞 {p.telefono}</div>}
              {p.email && <div style={{ fontSize: 13, color: "#a89f8d", marginTop: 2 }}>✉️ {p.email}</div>}
            </div>

            {hora && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", background: "rgba(200,30,34,0.08)", borderRadius: 10, padding: "0.875rem 1.125rem", border: "1px solid rgba(200,30,34,0.25)" }}>
                <span style={{ fontSize: 24 }}>🕐</span>
                <div>
                  <div style={{ fontSize: 10, color: "#a89f8d", textTransform: "uppercase", letterSpacing: "0.1em" }}>{lang === "en" ? "Pickup Time" : "Hora de Recogida"}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#f3ede0", fontFamily: "monospace" }}>{hora}</div>
                </div>
              </div>
            )}

            <div style={{ border: "1px solid rgba(200,30,34,0.25)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "0.6rem 1rem", background: "rgba(200,30,34,0.12)", borderBottom: "1px solid rgba(200,30,34,0.2)" }}>
                <span style={{ fontSize: 11, color: "#c81e22", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>📝 {lang === "en" ? "Kitchen Notes" : "Notas de Cocina"}</span>
              </div>
              <div style={{ padding: "0.9rem 1rem", background: "rgba(255,255,255,0.02)" }}>
                <p style={{ fontSize: 14, color: p.notas ? "#f3ede0" : "rgba(255,255,255,0.3)", lineHeight: 1.5, margin: 0, fontStyle: p.notas ? "normal" : "italic", fontWeight: p.notas ? 600 : 400 }}>
                  {p.notas || (lang === "en" ? "No special instructions" : "Sin notas especiales")}
                </p>
              </div>
            </div>
          </div>

          {/* Derecha: Items y Total */}
          <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>{lang === "en" ? "Items" : "Productos"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
              {p.items.map((item, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.8rem", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                  {item.image && <img src={item.image} alt={item.name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: "#f3ede0", fontWeight: 500 }}>{lang === "en" && item.nameEn ? item.nameEn : item.name}</div>
                    {item.categoria && <div style={{ fontSize: 10, color: "#c81e22", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.categoria}</div>}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#c81e22" }}>{item.qty}×</span>
                  <span style={{ fontSize: 14, color: "#a89f8d", fontFamily: "monospace" }}>{(item.qty * item.price).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "auto" }}>
              <span style={{ fontSize: 13, color: "#a89f8d", textTransform: "uppercase", letterSpacing: "0.1em" }}>Total</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: "#f3ede0" }}>{p.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PedidoCard ───────────────────────────────────────────────────────────────

function PedidoCard({ p, lang, onAction }: {
  p: PedidoDB;
  lang: string;
  onAction: (id: number, estado: string, extra?: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const isPagado = p.metodoPago !== "local" && p.metodoPago !== "restaurante";
  const hora = p.horaRecogida ? formatHora(p.horaRecogida) : null;
  const stopped = p.estado === "listo";
  const orderNum = p.numeroPedido || `OB-${String(p.id).padStart(4, "0")}`;

  return (
    <>
    {showDetail && <OrderDetailPopup p={p} lang={lang} onClose={() => setShowDetail(false)} />}
    <div style={{ padding: "1.1rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>

      {/* Fila 1: id + pago + delivery chip + nombre + hora/countdown */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#c81e22", fontWeight: 700 }}>
              #{orderNum}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              padding: "2px 8px", borderRadius: 20,
              background: isPagado ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)",
              color: isPagado ? "#4ade80" : "#fbbf24",
              border: `1px solid ${isPagado ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}` }}>
              {isPagado ? (lang === "en" ? "✓ Paid" : "✓ Pagado") : (lang === "en" ? "💵 Pay on pickup" : "💵 En mano")}
            </span>
            {(p.tipoEntrega === "domicilio" || p.tipoEntrega === "delivery") && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "2px 8px", borderRadius: 20,
                background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.35)" }}>
                🛵 {lang === "en" ? "Delivery" : "A Domicilio"}
              </span>
            )}
            {p.estado === "listo_reparto" && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "2px 8px", borderRadius: 20,
                background: "rgba(234,179,8,0.15)", color: "#facc15", border: "1px solid rgba(234,179,8,0.35)", animation: "pulseBlink 1.2s infinite" }}>
                ⏳ {lang === "en" ? "Awaiting Rider" : "Esperando Rider"}
              </span>
            )}
            {p.estado === "en_camino" && (
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                padding: "2px 8px", borderRadius: 20,
                background: "rgba(168,85,247,0.15)", color: "#c084fc", border: "1px solid rgba(168,85,247,0.35)" }}>
                🛵 {lang === "en" ? "On the way" : "En camino"}
              </span>
            )}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#f3ede0", lineHeight: 1.2, letterSpacing: "-0.01em" }}>{p.nombre}</div>
          {p.direccionEntrega && (
            <div style={{ fontSize: 12, color: "#93c5fd", marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>📍</span>
              <span style={{ fontWeight: 600 }}>{p.direccionEntrega} {p.direccionDetalles ? `(${p.direccionDetalles})` : ""}</span>
            </div>
          )}
          {hora && (
            <div style={{ marginTop: "0.3rem", display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
              <span style={{ fontSize: 10, color: "#a89f8d", textTransform: "uppercase", letterSpacing: "0.1em" }}>{lang === "en" ? "Pickup" : "Recogida"}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: "#f3ede0", fontFamily: "monospace", lineHeight: 1 }}>{hora}</span>
            </div>
          )}
        </div>
        {hora && <Countdown horaRecogida={p.horaRecogida!} stopped={stopped} lang={lang} />}
      </div>

      {/* Fila 2: items con imágenes */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", flex: 1 }}>
          {p.items.map((item, j) => (
            <div key={j} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: 13, color: "rgba(243,237,224,0.9)", fontWeight: 500, background: "rgba(255,255,255,0.03)", padding: "4px 8px 4px 4px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
              {item.image && <img src={item.image} alt={item.name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />}
              <span style={{ fontWeight: 800, color: "#c81e22" }}>{item.qty}×</span>
              <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lang === "en" && item.nameEn ? item.nameEn : item.name}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setShowDetail(true)}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "0.35rem", padding: "6px 10px", borderRadius: 7,
            border: `1px solid ${p.notas ? "rgba(200,30,34,0.4)" : "rgba(255,255,255,0.08)"}`, cursor: "pointer", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
            background: p.notas ? "rgba(200,30,34,0.18)" : "rgba(255,255,255,0.04)",
            color: p.notas ? "#ef4444" : "rgba(243,237,224,0.5)",
            animation: p.notas ? "pulseBlink 1.2s ease-in-out infinite" : "none" }}
          onMouseEnter={e => { e.currentTarget.style.background = p.notas ? "rgba(200,30,34,0.28)" : "rgba(255,255,255,0.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = p.notas ? "rgba(200,30,34,0.18)" : "rgba(255,255,255,0.04)"; }}>
          📝 {lang === "en" ? "Details" : "Detalles"}
        </button>
      </div>

      {/* Fila 3: total + botones de transición */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "#f3ede0", fontFamily: "monospace" }}>
          {p.total.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </span>
        <div style={{ flex: 1, display: "flex", gap: "0.4rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
          {p.estado === "nuevo" && (<>
            <button onClick={() => printTicket(p)} title="Imprimir ticket de cocina"
              style={{ display: "flex", alignItems: "center", padding: "7px 11px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: 14, background: "rgba(255,255,255,0.04)", color: "rgba(243,237,224,0.7)", transition: "all 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
              🖨️
            </button>
            <button onClick={() => onAction(p.id, "preparando")}
              style={{ flex: 1, minWidth: 90, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", transition: "opacity 150ms", boxShadow: "0 2px 10px rgba(249,115,22,0.25)" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              👨‍🍳 {lang === "en" ? "Prepare" : "Preparar"}
            </button>
          </>)}
          {p.estado === "preparando" && (<>
            <button onClick={() => onAction(p.id, "nuevo")}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "rgba(255,255,255,0.04)", color: "rgba(243,237,224,0.5)", transition: "all 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
              ← {lang === "en" ? "Back" : "Volver"}
            </button>
            <button onClick={() => onAction(p.id, "listo")}
              style={{ flex: 1, minWidth: 90, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", background: "linear-gradient(135deg,#10b981,#059669)", color: "#ffffff", transition: "opacity 150ms", boxShadow: "0 2px 10px rgba(16,185,129,0.25)" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              🔔 {lang === "en" ? "Ready" : "Listo"}
            </button>
          </>)}
          {p.estado === "listo" && (<>
            <button onClick={() => onAction(p.id, "preparando")}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "rgba(255,255,255,0.04)", color: "rgba(243,237,224,0.5)", transition: "all 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
              ← {lang === "en" ? "Back" : "Volver"}
            </button>
            {p.email && (
              <button onClick={() => onAction(p.id, "listo", "notify")}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(200,30,34,0.3)", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", background: "rgba(200,30,34,0.12)", color: "#ef4444", transition: "all 150ms" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,30,34,0.22)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,30,34,0.12)"; }}>
                ✉️ {lang === "en" ? "Notify" : "Avisar"}
              </button>
            )}
            {(p.tipoEntrega === "domicilio" || p.tipoEntrega === "delivery") ? (
              <button onClick={() => onAction(p.id, "listo_reparto")}
                style={{ flex: 1, minWidth: 105, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em",
                  background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
                  color: "#ffffff", transition: "opacity 150ms", boxShadow: "0 2px 10px rgba(59,130,246,0.35)" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                🛵 {lang === "en" ? "Send to Delivery" : "Enviar al Delivery"}
              </button>
            ) : (
              <button onClick={() => onAction(p.id, "entregado")}
                style={{ flex: 1, minWidth: 90, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em",
                  background: isPagado ? "linear-gradient(135deg,#c81e22,#99151b)" : "linear-gradient(135deg,#f59e0b,#d97706)",
                  color: "#ffffff", transition: "opacity 150ms", boxShadow: isPagado ? "0 2px 10px rgba(200,30,34,0.3)" : "0 2px 10px rgba(245,158,11,0.25)" }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                {isPagado ? `🙌 ${lang === "en" ? "Delivered" : "Entregado"}` : `💵 ${lang === "en" ? "Collect" : "Cobrar"}`}
              </button>
            )}
          </>)}
          {(p.estado === "listo_reparto" || p.estado === "en_camino") && (<>
            <button onClick={() => onAction(p.id, "listo")}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontWeight: 700, fontSize: 12, background: "rgba(255,255,255,0.04)", color: "rgba(243,237,224,0.5)", transition: "all 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
              ← {lang === "en" ? "Back" : "Volver"}
            </button>
            <button onClick={() => onAction(p.id, "entregado")}
              style={{ flex: 1, minWidth: 100, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em",
                background: "linear-gradient(135deg,#10b981,#059669)",
                color: "#ffffff", transition: "opacity 150ms", boxShadow: "0 2px 10px rgba(16,185,129,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              ✓ {lang === "en" ? "Delivered" : "Entregado"}
            </button>
          </>)}
        </div>
      </div>
    </div>
    {/* Separador degradado carmesí */}
    <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(200,30,34,0.2) 20%, rgba(200,30,34,0.2) 80%, transparent)", margin: "0 0.75rem" }} />
    </>
  );
}

// ── Columna ───────────────────────────────────────────────────────────────────

function Columna({ title, color, icon, pedidos, lang, onAction }: {
  title: string; color: string; icon: string;
  pedidos: PedidoDB[]; lang: string;
  onAction: (id: number, estado: string, extra?: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1, minWidth: 0 }}>
      <div style={{ padding: "0.875rem 1rem", borderBottom: `2px solid ${color}33`, background: `${color}08`, flexShrink: 0, display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 800, fontFamily: "monospace", color }}>{pedidos.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem" }}>
        {pedidos.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, color: "rgba(255,255,255,0.15)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>—</div>
        ) : (
          pedidos.map(p => <PedidoCard key={p.id} p={p} lang={lang} onAction={onAction} />)
        )}
      </div>
    </div>
  );
}

// ── DateNav ──────────────────────────────────────────────────────────────────

type NavMode = "day" | "week" | "month";

function DateNav({ selectedDate, navMode, onDate, onMode, lang }: {
  selectedDate: string;
  navMode: NavMode;
  onDate: (d: string) => void;
  onMode: (m: NavMode) => void;
  lang: string;
}) {
  const today = localISO(new Date());
  const offset = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return localISO(d); };

  const chips = [
    { label: lang === "en" ? "Yesterday" : "Ayer",    date: offset(-1) },
    { label: lang === "en" ? "Today" : "Hoy",         date: today },
    { label: lang === "en" ? "Tomorrow" : "Mañana",   date: offset(1) },
    { label: lang === "en" ? "Day after" : "Pasado",  date: offset(2) },
  ];

  const prev = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); onDate(localISO(d)); onMode("day"); };
  const next = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); onDate(localISO(d)); onMode("day"); };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
      <button onClick={prev} style={arrowBtn}>←</button>

      {chips.map(c => {
        const active = navMode === "day" && selectedDate === c.date;
        return (
          <button key={c.date} onClick={() => { onDate(c.date); onMode("day"); }}
            style={{
              ...chipBtn,
              background: active ? "#c81e22" : "rgba(255,255,255,0.05)",
              color: active ? "#ffffff" : "rgba(243,237,224,0.6)",
              borderColor: active ? "#c81e22" : "rgba(255,255,255,0.1)",
              boxShadow: active ? "0 2px 10px rgba(200,30,34,0.4)" : "none",
            }}>
            {c.label}
          </button>
        );
      })}

      <button onClick={next} style={arrowBtn}>→</button>

      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

      {(["week", "month"] as NavMode[]).map(m => {
        const active = navMode === m;
        return (
          <button key={m} onClick={() => onMode(m)}
            style={{
              ...chipBtn,
              background: active ? "rgba(200,30,34,0.2)" : "rgba(255,255,255,0.04)",
              color: active ? "#ef4444" : "rgba(243,237,224,0.45)",
              borderColor: active ? "rgba(200,30,34,0.45)" : "rgba(255,255,255,0.1)",
            }}>
            {m === "week" ? (lang === "en" ? "This week" : "Semana") : (lang === "en" ? "This month" : "Mes")}
          </button>
        );
      })}
    </div>
  );
}

const arrowBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)", color: "rgba(243,237,224,0.6)", cursor: "pointer",
  fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};
const chipBtn: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 7, border: "1px solid", cursor: "pointer",
  fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em",
  transition: "all 150ms", flexShrink: 0,
};

// ── LimitarPopup ─────────────────────────────────────────────────────────────

function LimitarPopup({ lang, onClose, onConfirm }: {
  lang: string;
  onClose: () => void;
  onConfirm: (tipo: string) => void;
}) {
  const options = [
    { key: "1h",     label: lang === "en" ? "1 hour"      : "1 hora"         },
    { key: "2h",     label: lang === "en" ? "2 hours"     : "2 horas"        },
    { key: "3h",     label: lang === "en" ? "3 hours"     : "3 horas"        },
    { key: "4h",     label: lang === "en" ? "4 hours"     : "4 horas"        },
    { key: "cierre", label: lang === "en" ? "Until close" : "Hasta cierre"   },
    { key: "hoy",    label: lang === "en" ? "Disable today" : "Desactivar hoy" },
  ];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(6px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0e0d0b", border: "1px solid rgba(200,30,34,0.3)", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 360, boxShadow: "0 20px 50px rgba(0,0,0,0.85), 0 0 25px rgba(200,30,34,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "#ef4444", marginBottom: "1.5rem" }}>
          {lang === "en" ? "How long to limit?" : "¿Cuánto tiempo limitar?"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {options.map(o => (
            <button key={o.key} onClick={() => onConfirm(o.key)}
              style={{ padding: "0.875rem 1.25rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(243,237,224,0.85)", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", transition: "all 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,30,34,0.15)"; e.currentTarget.style.borderColor = "rgba(200,30,34,0.45)"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(243,237,224,0.85)"; }}>
              {o.label}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: "1rem", width: "100%", padding: "0.75rem", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", transition: "all 150ms" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
          {lang === "en" ? "Cancel" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}

// ── SaturacionWidget ──────────────────────────────────────────────────────────

function SaturacionWidget({ sat, lang, isMobile, onLimitar, onReactivar }: {
  sat: SaturacionState;
  lang: string;
  isMobile: boolean;
  onLimitar: () => void;
  onDesactivarHoy: () => void;
  onReactivar: () => void;
}) {
  const isLimitado = sat.modo === "limitado";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: isMobile ? "0.35rem 0.625rem" : "0.4rem 0.75rem", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isLimitado ? "#ef4444" : "#4ade80", boxShadow: `0 0 8px ${isLimitado ? "#ef4444" : "#4ade80"}`, display: "inline-block", flexShrink: 0 }} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: isLimitado ? "#ef4444" : "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
        {lang === "en" ? "HIGH DEMAND" : "ALTA DEMANDA"}
      </span>
      <button
        onClick={isLimitado ? onReactivar : onLimitar}
        style={{ padding: "4px 11px", borderRadius: 6, border: `1px solid ${isLimitado ? "rgba(255,255,255,0.15)" : "rgba(239,68,68,0.45)"}`, background: isLimitado ? "rgba(255,255,255,0.05)" : "rgba(239,68,68,0.1)", color: isLimitado ? "rgba(255,255,255,0.6)" : "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 150ms", whiteSpace: "nowrap" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
        {isLimitado ? (lang === "en" ? "DEACTIVATE" : "DESACTIVAR") : (lang === "en" ? "ACTIVATE" : "ACTIVAR")}
      </button>
    </div>
  );
}

// ── Monitor Inner ─────────────────────────────────────────────────────────────

function MonitorInner() {
  const { lang, setLang, tr } = useMonitorLanguage();
  const router = useRouter();
  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const [isMobile, setIsMobile]         = useState(false);
  const [pedidos, setPedidos]           = useState<PedidoDB[]>([]);
  const [allPedidos, setAllPedidos]     = useState<PedidoDB[]>([]);
  const pendingIds                      = useRef<Set<number>>(new Set()).current;
  const [navMode, setNavMode]           = useState<NavMode>("day");
  const [selectedDate, setSelectedDate] = useState(localISO(new Date()));
  const [mobileTab, setMobileTab]       = useState<"nuevo" | "preparando" | "listo">("nuevo");
  const [saturacion, setSaturacion]     = useState<SaturacionState>({ modo: "activo", hasta: null, tipo: null, por: null, umbralPedidos: "35", umbralMinutos: "60", manualOverride: false });
  const [showLimitarPopup, setShowLimitarPopup] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const beat = () => fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    beat();
    const id = setInterval(beat, 5000);
    return () => clearInterval(id);
  }, []);

  const loadSaturacion = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/saturacion");
      if (res.ok) setSaturacion(await res.json());
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    loadSaturacion();
    const id = setInterval(loadSaturacion, 5000);
    return () => clearInterval(id);
  }, [loadSaturacion]);

  const loadPedidos = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pedidos");
      if (res.ok) {
        const data: PedidoDB[] = await res.json();
        setPedidos(prev => {
          const incoming = data.filter(p => p.estado !== "entregado" && p.estado !== "pendiente_pago");
          return incoming.map(p => pendingIds.has(p.id) ? (prev.find(x => x.id === p.id) ?? p) : p);
        });
        setAllPedidos(data.filter(p => p.estado === "entregado"));
      }
    } catch (e) {
      console.error("[loadPedidos]", e);
    }
  }, [pendingIds]);

  useEffect(() => {
    loadPedidos();
    const interval = setInterval(loadPedidos, 5000);
    return () => clearInterval(interval);
  }, [loadPedidos]);

  const handleAction = async (id: number, estado: string, extra?: string) => {
    if (extra === "notify") {
      await fetch(`/api/admin/pedidos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _action: "notify" }) });
      return;
    }
    pendingIds.add(id);
    if (estado === "entregado") {
      setPedidos(prev => prev.filter(p => p.id !== id));
    } else {
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
    }
    try {
      await fetch(`/api/admin/pedidos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado }) });
    } finally {
      pendingIds.delete(id);
    }
  };

  const handleSaturacionLimitar = async (tipo: string) => {
    setShowLimitarPopup(false);
    try {
      const res = await fetch("/api/admin/saturacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "limitar", tipo }),
      });
      if (res.ok) setSaturacion(await res.json());
    } catch { /* silencioso */ }
  };

  const handleSaturacionReactivar = async () => {
    try {
      const res = await fetch("/api/admin/saturacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "reactivar" }),
      });
      if (res.ok) setSaturacion(await res.json());
    } catch { /* silencioso */ }
  };

  // Filtro fecha
  const filterByNav = (lista: PedidoDB[]) => {
    if (navMode === "day") return lista.filter(p => (p.createdAt ?? "").slice(0, 10) === selectedDate);
    if (navMode === "week") {
      const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0);
      return lista.filter(p => new Date(p.createdAt ?? 0) >= start);
    }
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return lista.filter(p => new Date(p.createdAt ?? 0) >= start);
  };

  const pedidosFiltrados = filterByNav(pedidos);

  const nuevos     = sortByProximity(pedidosFiltrados.filter(p => p.estado === "nuevo"));
  const preparando = sortByProximity(pedidosFiltrados.filter(p => p.estado === "preparando"));
  const listos     = sortByProximity(pedidosFiltrados.filter(p => ["listo", "listo_reparto", "en_camino"].includes(p.estado)));

  const COLS = [
    { key: "nuevo"      as const, title: lang === "en" ? "New"       : "Nuevos",     color: "#60a5fa", icon: "🆕", data: nuevos     },
    { key: "preparando" as const, title: lang === "en" ? "Preparing" : "Preparando", color: "#f97316", icon: "👨‍🍳", data: preparando },
    { key: "listo"      as const, title: lang === "en" ? "Ready & Delivery" : "Listos / Reparto", color: "#4ade80", icon: "🔔", data: listos },
  ];

  return (
    <div style={{ height: "100dvh", background: "#0c0b0a", color: "#f3ede0", fontFamily: "var(--font-dm-sans), system-ui, sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* POPUP LIMITAR */}
      {showLimitarPopup && (
        <LimitarPopup
          lang={lang}
          onClose={() => setShowLimitarPopup(false)}
          onConfirm={handleSaturacionLimitar}
        />
      )}

      {/* HEADER */}
      <header style={{ background: "#0e0d0b", borderBottom: "2px solid rgba(200,30,34,0.22)", padding: isMobile ? "0.6rem 0.8rem" : "0.75rem 1.8rem", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          
          {/* Logo y título al estilo Obento Dashboard */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: isMobile ? 36 : 42,
                height: isMobile ? 36 : 42,
                borderRadius: "50%",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
                padding: "2px",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <Image
                src="/images/logo-obento.png"
                alt="OBENTO"
                width={isMobile ? 32 : 38}
                height={isMobile ? 32 : 38}
                style={{ objectFit: "contain" }}
                priority
              />
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 900, letterSpacing: "0.18em", color: "#ffffff", lineHeight: 1.1 }}>
                OBENTO
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.18em", color: "#c81e22", textTransform: "uppercase", marginTop: 2 }}>
                MONITOR TAKE AWAY
              </div>
            </div>
          </div>

          {/* Saturación, status db, reloj, fecha, idioma, logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <SaturacionWidget
              sat={saturacion}
              lang={lang}
              isMobile={isMobile}
              onLimitar={() => setShowLimitarPopup(true)}
              onDesactivarHoy={() => handleSaturacionLimitar("hoy")}
              onReactivar={handleSaturacionReactivar}
            />

            {!isMobile && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "4px 10px", borderRadius: 20, background: "rgba(74, 222, 128, 0.08)", border: "1px solid rgba(74, 222, 128, 0.25)", fontSize: 11, fontWeight: 600, color: "#4ade80" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }} />
                obento_db
              </div>
            )}

            {!isMobile && (
              <span style={{ fontSize: 13, color: "#a89f8d", textTransform: "capitalize" }}>
                <LiveDate lang={lang} />
              </span>
            )}
            <span style={{ fontSize: isMobile ? 18 : 17, fontWeight: 700, color: "#f3ede0", fontFamily: "monospace" }}>
              <LiveClock />
            </span>
            <LanguageSelector variant="monitor" lang={lang} setLang={setLang} />
            <button
              onClick={handleLogout}
              title={lang === "en" ? "Logout" : "Cerrar sesión"}
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(243,237,224,0.5)", cursor: "pointer", transition: "all 150ms" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,30,34,0.18)"; e.currentTarget.style.color = "#fca5a5"; e.currentTarget.style.borderColor = "rgba(200,30,34,0.35)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(243,237,224,0.5)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* STATS + FECHAS */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: isMobile ? "0.5rem 0.75rem" : "0.5rem 1.8rem", flexShrink: 0, display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexShrink: 0 }}>
          <ShoppingBag size={18} style={{ color: "#c81e22", flexShrink: 0 }} />
          {COLS.map(c => (
            <div key={c.key} style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em" }}>{c.title}</span>
              <span style={{ fontFamily: "monospace", fontSize: 24, fontWeight: 800, color: c.color, lineHeight: 1 }}>{c.data.length}</span>
            </div>
          ))}
        </div>

        <div style={{ marginLeft: "auto" }}>
          <DateNav
            selectedDate={selectedDate}
            navMode={navMode}
            onDate={(d) => setSelectedDate(d)}
            onMode={(m) => setNavMode(m)}
            lang={lang}
          />
        </div>
      </div>

      {/* MOBILE TABS */}
      {isMobile && (
        <div style={{ display: "flex", gap: "4px", padding: "0.4rem 0.5rem", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {COLS.map(c => (
            <button key={c.key} onClick={() => setMobileTab(c.key)}
              style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", transition: "all 150ms",
                background: mobileTab === c.key ? `${c.color}22` : "transparent",
                color: mobileTab === c.key ? c.color : "rgba(255,255,255,0.4)",
                borderBottom: mobileTab === c.key ? `2px solid ${c.color}` : "2px solid transparent" }}>
              {c.icon} {c.title} ({c.data.length})
            </button>
          ))}
        </div>
      )}

      {/* COLUMNAS */}
      <div style={{ flex: 1, display: isMobile ? "block" : "grid", gridTemplateColumns: "1fr 1fr 1fr", overflow: "hidden" }}>
        {isMobile ? (
          COLS.filter(c => c.key === mobileTab).map(c => (
            <div key={c.key} style={{ height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Columna title={c.title} color={c.color} icon={c.icon} pedidos={c.data} lang={lang} onAction={handleAction} />
            </div>
          ))
        ) : (
          COLS.map((c, i) => (
            <div key={c.key} style={{ overflow: "hidden", display: "flex", flexDirection: "column", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <Columna title={c.title} color={c.color} icon={c.icon} pedidos={c.data} lang={lang} onAction={handleAction} />
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulseBlink {
          0%, 100% { opacity: 1; box-shadow: 0 0 0px rgba(200,30,34,0); }
          50% { opacity: 0.6; box-shadow: 0 0 12px rgba(200,30,34,0.65); }
        }
      `}</style>
    </div>
  );
}

export default function ObentoMonitorTakeawayPage() {
  return (
    <AuthGate>
      <MonitorLanguageProvider>
        <MonitorInner />
      </MonitorLanguageProvider>
    </AuthGate>
  );
}
