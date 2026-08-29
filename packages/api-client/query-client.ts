import { QueryClient } from "@tanstack/react-query";

/**
 * Shared TanStack Query defaults so caching behavior (how long a property
 * listing or availability result stays "fresh") is one decision, not two.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
