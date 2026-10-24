import { useQuery } from '@tanstack/react-query';
import { authApi } from '../api/endpoints.js';

/**
 * Returns { admin, isLoading, isAuthenticated }
 * Used to guard routes and display user info.
 */
export function useAuth() {
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await authApi.me();
        return res ?? null;
      } catch (err) {
        if (err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  return {
    admin: data?.data ?? null,
    isLoading,
    isAuthenticated: !!data?.data,
  };
}
