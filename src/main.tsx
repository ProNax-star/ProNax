import { QueryClient } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

// Simple AsyncLocalStorage polyfill for browser
if (typeof window !== 'undefined' && !globalThis.AsyncLocalStorage) {
  globalThis.AsyncLocalStorage = class AsyncLocalStorage {
    private store: Map<any, any> = new Map();
    
    getStore() {
      return this.store.get('current');
    }
    
    run(store, callback) {
      this.store.set('current', store);
      try {
        return callback();
      } finally {
        this.store.delete('current');
      }
    }
    
    enterWith(store) {
      this.store.set('current', store);
    }
  } as any;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createRouter({
  routeTree,
  context: { queryClient },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const app = (
  <RouterProvider router={router} />
);

import { createRoot } from "react-dom/client";
createRoot(rootElement).render(app);
