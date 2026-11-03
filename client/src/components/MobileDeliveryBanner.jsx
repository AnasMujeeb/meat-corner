import { useSettings } from "../api/queries.js";
import { useLanguage } from "../hooks/useLanguage.js";

export function TalabatIcon({ size = 20 }) {
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

export function SnoonuIcon({ size = 20 }) {
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

export function KeetaIcon({ size = 20 }) {
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

/**
 * Shared component rendering the delivery platforms action buttons
 * (Talabat, Snoonu, KeeTa).
 * Equal-width row, comfortable tap target (>=44px), new tab with rel="noopener noreferrer".
 * Hides any platform whose URL is empty. Returns null if all links are empty.
 */
export function DeliveryPlatformActions({ className = "", ariaLabelPrefix = "" }) {
  const { data: settings = {} } = useSettings();
  const { t } = useLanguage();

  const talabatUrl = settings?.socials?.talabat || "";
  const snoonuUrl = settings?.socials?.snoonu || "";
  const keetaUrl = settings?.socials?.keeta || "";

  const hasAnyLink = Boolean(talabatUrl || snoonuUrl || keetaUrl);
  if (!hasAnyLink) return null;

  return (
    <div className={`delivery-platform-actions ${className}`}>
      {talabatUrl && (
        <a
          href={talabatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="delivery-pill delivery-pill--talabat"
          aria-label={t("footer.orderTalabat")}
        >
          <TalabatIcon size={20} />
          <span>Talabat</span>
        </a>
      )}
      {snoonuUrl && (
        <a
          href={snoonuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="delivery-pill delivery-pill--snoonu"
          aria-label={t("footer.orderSnoonu")}
        >
          <SnoonuIcon size={20} />
          <span>Snoonu</span>
        </a>
      )}
      {keetaUrl && (
        <a
          href={keetaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="delivery-pill delivery-pill--keeta"
          aria-label={t("mode.orderOnKeeta")}
        >
          <KeetaIcon size={20} />
          <span>KeeTa</span>
        </a>
      )}
    </div>
  );
}

/**
 * Inline delivery banner shown on mobile (<=768px) in delivery mode:
 * - Placed right under the mode bar
 * - Repeated once before the footer
 * - Scrolls away with page content (not fixed/sticky)
 */
export default function MobileDeliveryBanner({ className = "" }) {
  const { data: settings = {} } = useSettings();
  const { t } = useLanguage();

  const talabatUrl = settings?.socials?.talabat || "";
  const snoonuUrl = settings?.socials?.snoonu || "";
  const keetaUrl = settings?.socials?.keeta || "";

  const hasAnyLink = Boolean(talabatUrl || snoonuUrl || keetaUrl);
  if (!hasAnyLink) return null;

  return (
    <aside
      className={`mobile-delivery-banner ${className}`}
      aria-label={t("mode.orderOnline")}
    >
      <div className="mobile-delivery-banner__inner">
        <span className="mobile-delivery-banner__label">
          {t("mode.orderOnline")}
        </span>
        <DeliveryPlatformActions className="mobile-delivery-banner__actions" />
      </div>
    </aside>
  );
}

