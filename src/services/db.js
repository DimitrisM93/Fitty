import { openDB } from 'idb';

const DB_NAME = 'fitai_db';
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Meal logs
      if (!db.objectStoreNames.contains('meals')) {
        const mealStore = db.createObjectStore('meals', { keyPath: 'id', autoIncrement: true });
        mealStore.createIndex('date', 'date');
      }
      // Activity logs
      if (!db.objectStoreNames.contains('activity')) {
        const actStore = db.createObjectStore('activity', { keyPath: 'id', autoIncrement: true });
        actStore.createIndex('date', 'date');
      }
    },
  });
}

// ---- Meals ----
export async function saveMeal(mealData) {
  const db = await getDB();
  const today = new Date().toLocaleDateString('en-CA');
  return db.add('meals', { ...mealData, date: today, timestamp: Date.now() });
}

export async function getMealsForDate(date) {
  const db = await getDB();
  return db.getAllFromIndex('meals', 'date', date);
}

export async function deleteMeal(id) {
  const db = await getDB();
  return db.delete('meals', id);
}

export async function getMealsForWeek() {
  const db = await getDB();
  const all = await db.getAll('meals');
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return all.filter(m => m.timestamp >= weekAgo);
}

// ---- Activity snapshots (cached from Google Fit) ----
export async function saveActivitySnapshot(data) {
  const db = await getDB();
  const today = new Date().toLocaleDateString('en-CA');
  // Replace today's snapshot
  const existing = await db.getAllFromIndex('activity', 'date', today);
  for (const e of existing) await db.delete('activity', e.id);
  return db.add('activity', { ...data, date: today, timestamp: Date.now() });
}

export async function getActivityForDate(date) {
  const db = await getDB();
  const results = await db.getAllFromIndex('activity', 'date', date);
  return results[0] || null;
}

export async function getActivityForWeek() {
  const db = await getDB();
  const all = await db.getAll('activity');
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return all.filter(a => a.timestamp >= weekAgo);
}
