
// AsyncLocalStorage polyfill for browser environment
// This provides a working AsyncLocalStorage constructor for client-side code
// Server-side code uses Node.js native node:async_hooks

class AsyncLocalStorage {
  private store: Map<any, any> = new Map();
  private static instance: AsyncLocalStorage | null = null;
  
  constructor() {
    // Singleton pattern to ensure consistent state across instances
    if (!AsyncLocalStorage.instance) {
      AsyncLocalStorage.instance = this;
    }
    return AsyncLocalStorage.instance;
  }
  
  getStore() {
    return this.store.get('current');
  }
  
  run(store, callback) {
    const previousStore = this.store.get('current');
    this.store.set('current', store);
    try {
      return callback();
    } finally {
      if (previousStore !== undefined) {
        this.store.set('current', previousStore);
      } else {
        this.store.delete('current');
      }
    }
  }
  
  enterWith(store) {
    this.store.set('current', store);
  }
  
  // Additional methods that might be needed by TanStack Start
  static bind() {
    return this;
  }
  
  snapshot() {
    return this.store.get('current');
  }
}

// Set globally in browser environment BEFORE any TanStack Start initialization
if (typeof window !== 'undefined') {
  // Set on globalThis first
  (globalThis as any).AsyncLocalStorage = AsyncLocalStorage;
  
  // Also set on window for compatibility
  (window as any).AsyncLocalStorage = AsyncLocalStorage;
  
  // Initialize a default instance
  const defaultInstance = new AsyncLocalStorage();
  (globalThis as any).__asyncLocalStorageInstance = defaultInstance;
  
  console.log('[AsyncLocalStorage] Polyfill initialized in browser environment');
}

// Named export
export { AsyncLocalStorage };

// Default export as the class itself (for import { AsyncLocalStorage } from 'node:async_hooks')
export default AsyncLocalStorage;
