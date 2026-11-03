import { useSettings } from "../api/queries.js";
import { useLanguage } from "../hooks/useLanguage.js";
import { DeliveryPlatformActions } from "./MobileDeliveryBanner.jsx";

/**
 * Desktop floating delivery bar:
 * Stays mounted in App.jsx. CSS transition handles show/hide via
 * `delivery-bottom-bar--hidden` class.
 *
 * Hidden on mobile (<=768px via CSS) where mobile delivery banners + ItemModal
 * delivery actions take over.
 */
export default function DeliveryBottomBar({ hidden = false }) {
  const { data: settings = {} } = useSettings();
  const { t } = useLanguage();

  const talabatUrl = settings?.socials?.talabat || "";
  const snoonuUrl = settings?.socials?.snoonu || "";
  const keetaUrl = settings?.socials?.keeta || "";

  const hasAnyLink = Boolean(talabatUrl || snoonuUrl || keetaUrl);

  return (
    <div
      className={`delivery-bottom-bar${hidden || !hasAnyLink ? " delivery-bottom-bar--hidden" : ""}`}
      role="region"
      aria-label={t("mode.orderOnline")}
      aria-hidden={hidden || !hasAnyLink ? "true" : undefined}
    >
      <div className="delivery-bottom-bar__inner site-container">
        <span className="delivery-bottom-bar__prompt">
          {t("mode.orderOnline")}
        </span>
        <DeliveryPlatformActions className="delivery-bottom-bar__actions" />
      </div>
    </div>
  );
}
