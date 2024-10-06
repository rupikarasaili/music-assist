// indexedDBUtils.js
import { openDB } from "idb";

const DB_NAME = "MusicAssisDB";
const STORE_NAME = "mediaFiles";

// Initialize IndexedDB and create necessary object store
export async function initDB() {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    },
  });
  return db;
}

// Function to get media from IndexedDB
export async function getMediaFromIndexedDB(id) {
  const db = await initDB();
  const result = await db.get(STORE_NAME, id);
  return result?.blob || null;
}

// Function to save media to IndexedDB
export async function saveMediaToIndexedDB(id, fileBlob) {
  const db = await initDB();
  await db.put(STORE_NAME, { id, blob: fileBlob });
  console.log(`File saved with id: ${id}`);
}
