// AsyncLocalStorage polyfill for browser environment
class AsyncLocalStorage {
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
}

// Export as default to match node:async_hooks behavior
export default {
  AsyncLocalStorage: AsyncLocalStorage
};

// Also export individually
export { AsyncLocalStorage };

// Make it available globally for compatibility
if (typeof globalThis !== 'undefined') {
  (globalThis as any).AsyncLocalStorage = AsyncLocalStorage;
}