import { useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartProvider } from "./context/CartProvider.jsx";
import { LanguageProvider } from "./context/LanguageProvider.jsx";
import { ModeProvider, useMode } from "./context/ModeProvider.jsx";
import { useLanguage } from "./hooks/useLanguage.js";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import MobileBottomNav from "./components/MobileBottomNav.jsx";
import DeliveryBottomBar from "./components/DeliveryBottomBar.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ScrollToTop from "./components/ScrollToTop.jsx";

// Lazy-loaded pages for code splitting & performance
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const MenuPage = lazy(() => import("./pages/MenuPage.jsx"));
const HealthyPage = lazy(() => import("./pages/HealthyPage.jsx"));
const KidsPage = lazy(() => import("./pages/KidsPage.jsx"));
const CateringPage = lazy(() => import("./pages/CateringPage.jsx"));
const StoryPage = lazy(() => import("./pages/StoryPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));
const CartPage = lazy(() => import("./pages/CartPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  const { t } = useLanguage();

  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
        padding: "40px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 14,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "var(--ink)",
        }}
      >
        {t("common.loading") || "LOADING..."}
      </div>
    </div>
  );
}

function AppContent() {
  const [cartOpen, setCartOpen] = useState(false);
  const { isDelivery } = useMode();

  return (
    <div className={`site-wrapper${isDelivery ? " mode--delivery" : " mode--dine-in"}`} style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Header onCartOpen={() => setCartOpen(true)} />

      {/* Main View with Suspense code splitting + ErrorBoundary */}
      <main id="main-content" style={{ flex: 1, paddingBottom: isDelivery ? "calc(var(--mobile-nav-h, 0px) + 70px)" : "var(--mobile-nav-h, 0px)" }}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/menu/dine-in" element={<MenuPage initialMode="dine-in" />} />
              <Route path="/menu/delivery" element={<MenuPage initialMode="delivery" />} />
              <Route path="/healthy" element={<HealthyPage />} />
              <Route path="/kids" element={<KidsPage />} />
              <Route path="/catering" element={<CateringPage />} />
              <Route path="/story" element={<StoryPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Delivery Bottom Sticky Bar — always mounted, CSS shows/hides */}
      <DeliveryBottomBar hidden={!isDelivery} />

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onCartOpen={() => setCartOpen(true)} />

      {/* Cart Drawer */}
      {!isDelivery && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Router>
          <ScrollToTop />
          <ModeProvider>
            <CartProvider>
              <AppContent />
            </CartProvider>
          </ModeProvider>
        </Router>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
