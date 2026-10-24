import { useQuery } from "@tanstack/react-query";
import { api } from "../api.js";

const FIVE_MINUTES = 5 * 60 * 1000;

export function useSettings() {
  return useQuery({
    queryKey: ["public", "settings"],
    queryFn: async () => {
      const res = await api.settings();
      return res.data || res || {};
    },
    staleTime: 30 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["public", "categories"],
    queryFn: async () => {
      const res = await api.categories();
      return res.data || res || [];
    },
    staleTime: FIVE_MINUTES,
  });
}

export function useBranches() {
  return useQuery({
    queryKey: ["public", "branches"],
    queryFn: async () => {
      const res = await api.branches();
      return res.data || res || [];
    },
    staleTime: FIVE_MINUTES,
  });
}

export function useMenu(params = {}, extraOptions = {}) {
  return useQuery({
    queryKey: ["public", "menu", params],
    queryFn: async () => {
      const res = await api.menu(params);
      return {
        items: res.data || res.items || [],
        pagination: res.pagination || {
          page: res.page || Number(params.page) || 1,
          limit: params.limit || 24,
          total: res.total ?? (res.data || []).length,
          totalPages: res.totalPages || 1,
        },
      };
    },
    staleTime: FIVE_MINUTES,
    // Spread caller-supplied options last so they can override defaults (e.g. placeholderData)
    ...extraOptions,
  });
}

export function useMenuItem(slug) {
  return useQuery({
    queryKey: ["public", "menuItem", slug],
    queryFn: async () => {
      if (!slug) return null;
      const res = await api.menuItem(slug);
      return res.data || res || null;
    },
    enabled: Boolean(slug),
    staleTime: FIVE_MINUTES,
  });
}
