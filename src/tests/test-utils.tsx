import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import type { Employee } from "@/types";
import { resetAppStore } from "@/store/reset-app-store";
import { useAppStore } from "@/store/useAppStore";

export * from "@/stories/fixtures";
export {
  resetStoryEnvironment,
  seedBalanceSnapshot,
  seedPendingRequest,
  triggerAnniversaryDrift,
  triggerReconciliation,
} from "@/stories/helpers";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}

export function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

export interface RenderWithProvidersOptions extends Omit<
  RenderOptions,
  "wrapper"
> {
  queryClient?: QueryClient;
  resetStore?: boolean;
  currentUser?: Employee | null;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    resetStore = true,
    currentUser,
    ...renderOptions
  }: RenderWithProvidersOptions = {},
) {
  if (resetStore) {
    resetAppStore();
  }

  if (currentUser !== undefined) {
    useAppStore.getState().setCurrentUser(currentUser);
  }

  return {
    queryClient,
    ...render(ui, {
      wrapper: createWrapper(queryClient),
      ...renderOptions,
    }),
  };
}
