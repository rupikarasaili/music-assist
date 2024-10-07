// indexedDBUtils.js
import { openDB } from "idb";

const DB_NAME = "MusicAssisDB";
const STORE_NAME = "mediaFiles";

// Initialize IndexedDB and create necessary object store
export async function initDB() {
  try {
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
    return db;
  } catch (error) {
    console.error("Failed to initialize IndexedDB:", error);
  }
}

// Function to get media from IndexedDB
export async function getMediaFromIndexedDB(id) { 
  try {
    const db = await initDB();
    const result = await db.get(STORE_NAME, id);
    return result?.blob || null;
  } catch (error) {
    console.error(`Failed to fetch media with id: ${id}`, error);
    return null;
  }
}

// Function to save media to IndexedDB
export async function saveMediaToIndexedDB(id, fileBlob) {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, { id, blob: fileBlob });
    console.log(`File saved with id: ${id}`);
  } catch (error) {
    console.error(`Failed to save media with id: ${id}`, error);
  }
}
