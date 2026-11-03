/**
 * Returns localized string for an object and field based on current language.
 * When lang === 'ar' and obj[field + 'Ar'] is non-empty, returns obj[field + 'Ar'].
 * Otherwise falls back to obj[field] (English).
 * In English mode (lang === 'en'), it NEVER returns Arabic.
 *
 * @param {Object} obj - The data object (item, category, option group, choice, branch, etc.)
 * @param {string} field - The base field name (e.g. 'name', 'description', 'label')
 * @param {string} lang - 'en' or 'ar'
 * @returns {string} Localized string or empty string
 */
export function localized(obj, field, lang) {
  if (!obj || typeof obj !== "object") return "";
  if (lang === "ar") {
    const arVal = obj[`${field}Ar`];
    if (typeof arVal === "string" && arVal.trim() !== "") {
      return arVal.trim();
    }
  }
  const enVal = obj[field];
  return typeof enVal === "string" ? enVal : (enVal ?? "");
}

/**
 * Returns currency symbol based on current language: 'ر.ق' for Arabic, 'QAR' for English.
 *
 * @param {string} lang - 'en' or 'ar'
 * @returns {string} Currency string
 */
export function getCurrency(lang) {
  return lang === "ar" ? "ر.ق" : "QAR";
}

