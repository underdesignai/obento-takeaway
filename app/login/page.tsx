"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password }),
      });

      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error ?? "Credenciales incorrectas");
        setLoading(false);
      }
    } catch {
      setError("Error de conexión con el servidor");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 390 }}>
        {/* Cabecera con Logo circular y títulos */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.75rem" }}>
          {/* Logo Circular */}
          <div
            style={{
              width: 82,
              height: 82,
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.6)",
              marginBottom: "1.25rem",
              padding: "4px",
              boxSizing: "border-box",
              overflow: "hidden",
            }}
          >
            <Image
              src="/images/logo-obento.png"
              alt="OBENTO"
              width={76}
              height={76}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>

          {/* Título OBENTO */}
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: "0.28em",
              color: "#ffffff",
              textTransform: "uppercase",
              paddingLeft: "0.28em", // balance letter-spacing
            }}
          >
            OBENTO
          </h1>

          {/* Subtítulo rojo */}
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.26em",
              color: "#dc2626",
              textTransform: "uppercase",
              paddingLeft: "0.26em",
            }}
          >
            MONITOR
          </div>
        </div>

        <style>{`
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus, 
          input:-webkit-autofill:active {
            -webkit-text-fill-color: #ffffff !important;
            -webkit-box-shadow: 0 0 0px 1000px #17181d inset !important;
            transition: background-color 5000s ease-in-out 0s !important;
            color: #ffffff !important;
          }
        `}</style>

        {/* Tarjeta del formulario */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#111216",
            border: "1px solid rgba(220, 38, 38, 0.16)",
            borderRadius: 18,
            padding: "2rem 1.85rem",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.75), 0 0 20px rgba(220, 38, 38, 0.04)",
          }}
        >
          {/* Campo Usuario */}
          <div style={{ marginBottom: "1.35rem" }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#71717a",
                marginBottom: "0.45rem",
                fontWeight: 600,
              }}
            >
              USUARIO
            </label>
            <input
              type="text"
              value={user}
              onChange={e => setUser(e.target.value)}
              placeholder="admin"
              required
              autoFocus
              style={{
                width: "100%",
                background: "#17181d",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: 9,
                padding: "0.85rem 1rem",
                color: "#ffffff",
                fontSize: 14.5,
                fontWeight: 500,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.65)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(220, 38, 38, 0.35)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.09)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Campo Contraseña */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#71717a",
                marginBottom: "0.45rem",
                fontWeight: 600,
              }}
            >
              CONTRASEÑA
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                background: "#17181d",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                borderRadius: 9,
                padding: "0.85rem 1rem",
                color: "#ffffff",
                fontSize: 14.5,
                fontWeight: 500,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 150ms, box-shadow 150ms",
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.65)";
                e.currentTarget.style.boxShadow = "0 0 0 1px rgba(220, 38, 38, 0.35)";
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.09)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: "1.25rem",
                padding: "0.65rem 0.85rem",
                borderRadius: 8,
                background: "rgba(220, 38, 38, 0.12)",
                border: "1px solid rgba(220, 38, 38, 0.35)",
                fontSize: 12.5,
                color: "#fca5a5",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Botón Entrar */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.88rem 1rem",
              background: "linear-gradient(180deg, #c51d24 0%, #a0151b 100%)",
              color: "#ffffff",
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontWeight: 700,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 20px rgba(185, 28, 28, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.18)",
              opacity: loading ? 0.75 : 1,
              transition: "transform 120ms, filter 150ms, box-shadow 150ms",
            }}
            onMouseEnter={e => {
              if (!loading) {
                e.currentTarget.style.filter = "brightness(1.08)";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(185, 28, 28, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.25)";
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.filter = "none";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(185, 28, 28, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.18)";
            }}
          >
            {loading ? "Entrando..." : "ENTRAR"}
          </button>
        </form>
      </div>
    </div>
  );
}
