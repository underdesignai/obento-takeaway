"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import t, { Lang, MonitorTranslations } from "./i18n";

interface MonitorLanguageCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: { monitor: MonitorTranslations };
}

const MonitorLanguageContext = createContext<MonitorLanguageCtx>({
  lang: "es",
  setLang: () => {},
  tr: t.es,
});

export function MonitorLanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("es");

  useEffect(() => {
    const stored = localStorage.getItem("obento_monitor_lang") as Lang | null;
    if (stored === "es" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("obento_monitor_lang", l);
  };

  return (
    <MonitorLanguageContext.Provider value={{ lang, setLang, tr: t[lang] }}>
      {children}
    </MonitorLanguageContext.Provider>
  );
}

export function useMonitorLanguage() {
  return useContext(MonitorLanguageContext);
}
