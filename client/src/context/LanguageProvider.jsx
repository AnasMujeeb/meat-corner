import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import en from "../i18n/en.js";
import ar from "../i18n/ar.js";

const STORAGE_KEY = "meat_corner_lang";
const SUPPORTED_LANGS = ["en", "ar"];

export const LanguageContext = createContext({
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

  const setLang = useCallback((nextLang) => {
    if (SUPPORTED_LANGS.includes(nextLang)) {
      setLangState(nextLang);
    }
  }, []);

  // Translation function with fallback: Arabic -> English -> Key + placeholder replacement
  const t = useCallback((key, params) => {
    if (!key || typeof key !== "string") return "";
    let str = "";
    if (lang === "ar" && ar[key] !== undefined) {
      str = ar[key];
    } else if (en[key] !== undefined) {
      str = en[key];
    } else {
      str = key;
    }
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
    }
    return str;
  }, [lang]);

  // Keep <html> attributes in sync with current language & direction, and update SEO title/meta
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    const title = t("seo.title");
    if (title) {
      document.title = title;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    const desc = t("seo.description");
    if (metaDesc && desc) {
      metaDesc.setAttribute("content", desc);
    }
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage write errors
    }
  }, [lang, dir, t]);

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

