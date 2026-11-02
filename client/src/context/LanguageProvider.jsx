import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import en from "../i18n/en.js";
import ar from "../i18n/ar.js";

const STORAGE_KEY = "meat_corner_lang";
const SUPPORTED_LANGS = ["en", "ar"];

const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  dir: "ltr",
});

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) {
      return saved;
    }
  } catch {
    // LocalStorage access restricted (e.g. private browsing)
  }
  return "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLanguage);

  const dir = lang === "ar" ? "rtl" : "ltr";

  // Keep <html> attributes in sync with current language & direction
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage write errors
    }
  }, [lang, dir]);

  const setLang = useCallback((nextLang) => {
    if (SUPPORTED_LANGS.includes(nextLang)) {
      setLangState(nextLang);
    }
  }, []);

  // Translation function with fallback: Arabic -> English -> Key
  const t = useCallback((key) => {
    if (!key || typeof key !== "string") return "";
    if (lang === "ar" && ar[key] !== undefined) {
      return ar[key];
    }
    if (en[key] !== undefined) {
      return en[key];
    }
    return key;
  }, [lang]);

  const value = useMemo(() => ({
    lang,
    setLang,
    t,
    dir,
  }), [lang, setLang, t, dir]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

