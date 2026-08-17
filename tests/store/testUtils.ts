import { _resetDbForTests } from '@/store/db';
import { DB_NAME } from '@/types/store';

/** Wipes the fake-indexeddb database and the module-level connection cache
 * so each test starts from a clean, freshly-opened store. */
export async function resetDb(): Promise<void> {
  _resetDbForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
