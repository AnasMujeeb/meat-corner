import { Link } from "react-router-dom";
import { useSettings, useBranches } from "../api/queries.js";

function InstagramIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <radialGradient id="footer-ig-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(8 34) rotate(-55) scale(34 34)">
          <stop offset="0%" stopColor="#FFD521" />
          <stop offset="10%" stopColor="#FFD521" />
          <stop offset="50%" stopColor="#F50000" />
          <stop offset="100%" stopColor="#B900B4" />
        </radialGradient>
      </defs>
      <rect width="36" height="36" rx="8" fill="url(#footer-ig-grad)" />
      <rect x="8" y="8" width="20" height="20" rx="5.5" stroke="#FFFFFF" strokeWidth="2.2" fill="none" />
      <circle cx="18" cy="18" r="4.6" stroke="#FFFFFF" strokeWidth="2.2" fill="none" />
      <circle cx="23.3" cy="12.7" r="1.3" fill="#FFFFFF" />
    </svg>
  );
}

function TikTokIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#010101" />
      <g transform="translate(6.5, 6.5) scale(0.96)">
        <path
          d="M16.5 4.5c.8.9 1.9 1.5 3.1 1.6V2.6c-.9-.1-1.8-.6-2.4-1.3-.4-.5-.7-1.1-.7-1.8h-3v14c0 1.9-1.5 3.5-3.5 3.5s-3.5-1.6-3.5-3.5 1.6-3.5 3.5-3.5c.3 0 .7.1 1 .2V6.6c-.3 0-.7-.1-1-.1C5.6 6.5 2 10.1 2 14.5S5.6 22.5 10 22.5s8-3.6 8-8V9.1c2 .9 4 1.1 6 1V6.6c-2.7 0-5.1-1-7.5-2.1z"
          fill="#00F2FE"
          transform="translate(-0.8, -0.6)"
        />
        <path
          d="M16.5 4.5c.8.9 1.9 1.5 3.1 1.6V2.6c-.9-.1-1.8-.6-2.4-1.3-.4-.5-.7-1.1-.7-1.8h-3v14c0 1.9-1.5 3.5-3.5 3.5s-3.5-1.6-3.5-3.5 1.6-3.5 3.5-3.5c.3 0 .7.1 1 .2V6.6c-.3 0-.7-.1-1-.1C5.6 6.5 2 10.1 2 14.5S5.6 22.5 10 22.5s8-3.6 8-8V9.1c2 .9 4 1.1 6 1V6.6c-2.7 0-5.1-1-7.5-2.1z"
          fill="#FE2C55"
          transform="translate(0.8, 0.6)"
        />
        <path
          d="M16.5 4.5c.8.9 1.9 1.5 3.1 1.6V2.6c-.9-.1-1.8-.6-2.4-1.3-.4-.5-.7-1.1-.7-1.8h-3v14c0 1.9-1.5 3.5-3.5 3.5s-3.5-1.6-3.5-3.5 1.6-3.5 3.5-3.5c.3 0 .7.1 1 .2V6.6c-.3 0-.7-.1-1-.1C5.6 6.5 2 10.1 2 14.5S5.6 22.5 10 22.5s8-3.6 8-8V9.1c2 .9 4 1.1 6 1V6.6c-2.7 0-5.1-1-7.5-2.1z"
          fill="#FFFFFF"
        />
      </g>
    </svg>
  );
}

function WhatsAppIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#25D366" />
      <path
        fill="#FFFFFF"
        d="M26.2 9.8A11.5 11.5 0 0 0 18 6.4C11.6 6.4 6.4 11.6 6.4 18c0 2 .5 4 1.6 5.8L6.4 30l6.4-1.7a11.5 11.5 0 0 0 5.2 1.3h.1c6.4 0 11.6-5.2 11.6-11.6 0-3.1-1.2-6-3.5-8.2zm-8.2 18h-.1c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.8 1 1-3.7-.3-.4A9.6 9.6 0 0 1 8.4 18c0-5.3 4.3-9.6 9.6-9.6 2.6 0 5 1 6.8 2.8 1.8 1.8 2.8 4.2 2.8 6.8 0 5.3-4.3 9.6-9.6 9.6zm5.3-7.2c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1s-.8 1-.9 1.1c-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5s-.7-1.7-.9-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"
      />
    </svg>
  );
}

function TalabatIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#FF5A00" />
      <g fill="#FFFFFF">
        <path d="M14.2 9h4.2v6.2h4.8v4.2h-4.8v5.5c0 1.8 1 2.6 2.7 2.6h2.1v4.2H20c-4.4 0-5.8-2.3-5.8-5.8V19.4H12v-4.2h2.2V9z" />
        <circle cx="23.2" cy="9.6" r="2.6" />
      </g>
    </svg>
  );
}

function SnoonuIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#D90217" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M19.9158 27.8996C25.3443 27.8996 28.5932 24.8926 28.5932 21.1043C28.5932 15.245 19.0448 15.8309 19.0448 13.8409C19.0448 13.1776 19.7588 12.5143 21.1832 12.5143C23.4825 12.5143 25.778 13.8041 26.7687 14.858L29.6998 11.1472C27.5987 9.23463 24.391 8.09961 21.1795 8.09961C14.6182 8.09961 12.8611 8.09961 6.2998 8.09961L6.32972 8.27649C6.98398 11.3314 8.91683 13.2181 12.3227 14.1173C11.489 14.2979 10.5992 14.7217 9.96738 15.186C11.1413 17.2055 14.5995 18.9006 18.469 19.9914C20.5776 20.6547 22.4917 21.0711 22.4917 22.1582C22.4917 22.8989 21.6992 23.5254 20.4692 23.5254C17.7736 23.5254 14.8425 21.845 13.6537 20.5957L10.4422 24.4614C12.7788 26.6872 16.3866 27.8996 19.9121 27.8996H19.9158Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function KeetaIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="36" height="36" rx="8" fill="#FFD100" />
      <g fill="#000000">
        <text
          x="18"
          y="23"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="11.5"
          letterSpacing="-0.03em"
        >
          KeeTa
        </text>
      </g>
    </svg>
  );
}

const SOCIAL_METAS = [
  { key: "instagram", label: "Instagram", icon: InstagramIcon },
  { key: "tiktok",    label: "TikTok",    icon: TikTokIcon },
  { key: "whatsapp",  label: "WhatsApp",  icon: WhatsAppIcon },
];

function formatWhatsappUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("wa.me")) return `https://${trimmed}`;
  const digits = trimmed.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export default function Footer({ settings: propSettings }) {
  const { data: fetchedSettings } = useSettings();
  const { data: branches = [] } = useBranches();
  const settings = propSettings || fetchedSettings || {};

  // Filter only defined, non-empty social links from settings
  const activeSocials = SOCIAL_METAS.filter(({ key }) => {
    const val = settings?.socials?.[key];
    return typeof val === "string" && val.trim().length > 0;
  });

  const talabatUrl = settings?.socials?.talabat;
  const snoonuUrl = settings?.socials?.snoonu;

  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer__grid">
          <div className="site-footer__col">
            {settings?.logo ? (
              <img
                src={settings.logo}
                alt={settings.brandName || "Meat Corner"}
                className="site-footer__logo"
              />
            ) : (
              <strong className="site-footer__brand-title">
                {settings?.brandName || "MEAT CORNER"}
              </strong>
            )}
            <p className="site-footer__about-text">
              {settings?.aboutText || "Prime Steaks, Perfectly Grilled"}
            </p>

            {/* Social media links */}
            {activeSocials.length > 0 && (
              <div className="site-footer__social-list" aria-label="Social media links">
                {activeSocials.map(({ key, label, icon: Icon }) => {
                  const rawUrl = settings.socials[key];
                  const href = key === "whatsapp" ? formatWhatsappUrl(rawUrl) : rawUrl;
                  if (!href) return null;

                  return (
                    <a
                      key={key}
                      href={href}
                      className="site-footer__brand-badge"
                      aria-label={label}
                      title={label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon />
                    </a>
                  );
                })}
              </div>
            )}

            {/* Distinct "To Place Order" section with vibrant delivery platform logos */}
            <div className="site-footer__order-group">
              <h4 className="site-footer__group-title">To Place Order</h4>
              <div className="site-footer__delivery-list" aria-label="To Place Order platforms">
                {/* Talabat logo */}
                {talabatUrl ? (
                  <a
                    href={talabatUrl}
                    className="site-footer__brand-badge"
                    aria-label="Order on Talabat"
                    title="Talabat"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <TalabatIcon />
                  </a>
                ) : (
                  <span
                    className="site-footer__brand-badge site-footer__brand-badge--static"
                    title="Talabat"
                    aria-label="Talabat"
                  >
                    <TalabatIcon />
                  </span>
                )}

                {/* Snoonu logo: rendered whenever URL is provided by admin */}
                {snoonuUrl && (
                  <a
                    href={snoonuUrl}
                    className="site-footer__brand-badge"
                    aria-label="Order on Snoonu"
                    title="Snoonu"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SnoonuIcon />
                  </a>
                )}

                {/* Keeta logo: rendered without anchor tag */}
                <span
                  className="site-footer__brand-badge site-footer__brand-badge--static"
                  title="Keeta"
                  aria-label="Keeta"
                >
                  <KeetaIcon />
                </span>
              </div>
            </div>
          </div>

          <div className="site-footer__col">
            <h4>Explore</h4>
            <nav className="site-footer__nav-links" aria-label="Explore navigation">
              <Link to="/menu">Menu</Link>
              <Link to="/healthy">Healthy</Link>
              <Link to="/kids">Kids Menu</Link>
              {/* <Link to="/catering">Catering</Link> */}
            </nav>
          </div>

          <div className="site-footer__col">
            <h4>Visit</h4>
            {branches.length > 0 ? (
              branches.map((b) => (
                <a
                  key={b._id || b.name}
                  href={b.mapUrl || "https://maps.google.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {b.name} ↗
                </a>
              ))
            ) : (
              <>
                <Link to="/contact">Madinat Khalifa ↗</Link>
                <Link to="/contact">Centro ↗</Link>
              </>
            )}
            {settings?.contactPhone && (
              <a href={`tel:${settings.contactPhone}`}>{settings.contactPhone}</a>
            )}
            {settings?.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
            )}
          </div>

          <div className="site-footer__col">
            <h4>To Place Order</h4>
            {talabatUrl && (
              <a href={talabatUrl} target="_blank" rel="noopener noreferrer">
                Talabat ↗
              </a>
            )}
            {snoonuUrl && (
              <a href={snoonuUrl} target="_blank" rel="noopener noreferrer">
                Snoonu ↗
              </a>
            )}
            <span className="site-footer__static-text">Keeta (App only)</span>
            {settings?.socials?.whatsapp && formatWhatsappUrl(settings.socials.whatsapp) && (
              <a
                href={formatWhatsappUrl(settings.socials.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp ↗
              </a>
            )}
            <Link to="/contact">Directions ↗</Link>
          </div>
        </div>

        <div className="site-footer__watermark" aria-hidden="true">MEAT CORNER</div>
      </div>
    </footer>
  );
}
