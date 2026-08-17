/**
 * secureStore — AES-GCM encrypted browser persistence.
 *
 * Values are encrypted with a non-extractable AES-256-GCM key that lives in
 * IndexedDB, so the ciphertext written to localStorage cannot be read by
 * inspecting storage (or by a script that only scrapes localStorage) without
 * also having access to the origin's IndexedDB key handle.
 */

const DB_NAME = "pn_secure_store";
const DB_STORE = "keys";
const KEY_ID = "aes-gcm-v1";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("indexeddb open failed"));
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_STORE, "readwrite").objectStore(DB_STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

let keyPromise: Promise<CryptoKey> | null = null;

function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = (async () => {
      const db = await openDb();
      const existing = (await idbGet(db, KEY_ID)) as CryptoKey | undefined;
      if (existing) return existing;
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
        "encrypt",
        "decrypt",
      ]);
      await idbPut(db, KEY_ID, key);
      return key;
    })();
  }
  return keyPromise;
}

function toBase64(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += String.fromCharCode(b);
  return btoa(out);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function isSecureStoreAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof indexedDB !== "undefined" &&
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined"
  );
}

/** Encrypt and persist a JSON-serializable value under `storageKey`. */
export async function secureSet(storageKey: string, value: unknown): Promise<void> {
  if (!isSecureStoreAvailable()) return;
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    localStorage.setItem(
      storageKey,
      JSON.stringify({ v: 1, iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) }),
    );
  } catch {
    /* quota, private mode, or unavailable crypto — drop silently */
  }
}

/** Read and decrypt a value previously written with `secureSet`. */
export async function secureGet<T>(storageKey: string, fallback: T): Promise<T> {
  if (!isSecureStoreAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { v?: number; iv?: string; data?: string };
    if (parsed.v !== 1 || !parsed.iv || !parsed.data) {
      // Legacy plaintext payload — discard rather than trust it.
      localStorage.removeItem(storageKey);
      return fallback;
    }
    const key = await getKey();
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(parsed.iv) },
      key,
      fromBase64(parsed.data),
    );
    return JSON.parse(new TextDecoder().decode(plain)) as T;
  } catch {
    localStorage.removeItem(storageKey);
    return fallback;
  }
}

export function secureRemove(storageKey: string): void {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* noop */
  }
}
