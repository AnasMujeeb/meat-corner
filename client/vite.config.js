import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: true,
    // ── Prevent HMR restart loops caused by non-source asset folders ──────────
    watch: {
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        // Local image assets — changes here must NOT trigger full HMR reload
        "**/pictures/**",
        "**/public/pictures/**",
        "**/public/videos/**",
        // Server upload directory mounted via proxy — irrelevant to client HMR
        "**/uploads/**",
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: 4173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
      },
      "/uploads": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },

  // ── Pre-bundle heavy deps so Vite doesn't re-request them on cold start ────
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-router-dom",
      "framer-motion",
      "@tanstack/react-query",
    ],
  },

  build: {
    // ── Split vendor libraries into separate long-lived cache chunks ──────────
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router') || id.includes('node_modules/@remix-run/')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/framer-motion/')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
        },
      },
    },
    // Surface chunk-size warnings at a sensible threshold (kB)
    chunkSizeWarningLimit: 600,
  },
});
