const DB_NAME = 'CrazyMoesImageCache';
const STORE_NAME = 'processedImages';
const DB_VERSION = 1;
const CACHE_EXPIRY_DAYS = 7;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'url' });
      }
    };
  });

  return dbPromise;
}

interface CachedImage {
  url: string;
  processedDataUrl: string;
  timestamp: number;
}

export async function getCachedImage(url: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result as CachedImage | undefined;
        if (result) {
          // Check if cache is expired
          const expiryTime = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          if (Date.now() - result.timestamp < expiryTime) {
            resolve(result.processedDataUrl);
            return;
          }
        }
        resolve(null);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedImage(url: string, processedDataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const data: CachedImage = {
        url,
        processedDataUrl,
        timestamp: Date.now(),
      };

      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    // Silently fail - caching is optional
  }
}
