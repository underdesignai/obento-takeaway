"use client";

import { useState, useRef, useEffect } from "react";
import { useMonitorLanguage } from "@/lib/LanguageContext";
import { Lang } from "@/lib/i18n";

interface Props {
  lang?: Lang;
  setLang?: (l: Lang) => void;
  variant?: "navbar" | "admin" | "monitor";
}

const FLAGS: Record<Lang, string> = {
  es: "🇪🇸",
  en: "🇬🇧",
};

const LABELS: Record<Lang, string> = {
  es: "ES",
  en: "EN",
};

const OPTIONS: Lang[] = ["es", "en"];

export default function LanguageSelector({ lang: langProp, setLang: setLangProp, variant = "monitor" }: Props) {
  const ctx = useMonitorLanguage();
  const lang = langProp ?? ctx.lang;
  const setLang = setLangProp ?? ctx.setLang;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isNavbar = variant === "navbar";
  const btnBorder = isNavbar
    ? "1px solid rgba(201,168,76,0.4)"
    : "1px solid rgba(255,255,255,0.12)";

  const btnBg = isNavbar
    ? "rgba(10,10,15,0.7)"
    : "rgba(255,255,255,0.04)";

  const btnColor = isNavbar
    ? "#c9a84c"
    : "rgba(255,255,255,0.65)";

  const dropBg = isNavbar ? "#0e0d0b" : "#1a1a22";
  const dropBorder = isNavbar ? "1px solid rgba(201,168,76,0.25)" : "1px solid rgba(255,255,255,0.1)";

  return (
    <div ref={ref} style={{ position: "relative", userSelect: "none" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          padding: "0.45rem 0.85rem",
          border: btnBorder,
          borderRadius: 6,
          background: btnBg,
          color: btnColor,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.12em",
          cursor: "pointer",
          backdropFilter: "blur(8px)",
          transition: "border-color 150ms, background 150ms",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(201,168,76,0.8)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = isNavbar ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.12)";
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{LABELS[lang]}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ opacity: 0.6, transition: "transform 200ms", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: dropBg,
            border: dropBorder,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            zIndex: 9999,
            minWidth: 120,
          }}
        >
          {OPTIONS.map(opt => {
            const active = lang === opt;
            return (
              <button
                key={opt}
                role="option"
                aria-selected={active}
                onClick={() => { setLang(opt); setOpen(false); }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 1rem",
                  background: active ? "rgba(201,168,76,0.12)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  color: active ? "#c9a84c" : "rgba(255,255,255,0.65)",
                  letterSpacing: "0.08em",
                  textAlign: "left",
                  transition: "background 120ms, color 120ms",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "rgba(255,255,255,0.9)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                  }
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{FLAGS[opt]}</span>
                <span>{opt === "es" ? "Español" : "English"}</span>
                {active && (
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ marginLeft: "auto", color: "#c9a84c" }}
                  >
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
