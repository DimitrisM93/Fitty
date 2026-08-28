import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL (pooled) for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;

// Create tables if they don't exist
export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set — skipping DB table initialization');
    return;
  }
  let client;
  try {
    client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        meal_date DATE NOT NULL,
        logged_at TIMESTAMPTZ DEFAULT NOW(),
        meal_type TEXT,
        total_calories INT DEFAULT 0,
        total_protein REAL DEFAULT 0,
        total_carbs REAL DEFAULT 0,
        total_fat REAL DEFAULT 0,
        total_fiber REAL DEFAULT 0,
        items JSONB DEFAULT '[]',
        confidence TEXT,
        notes TEXT,
        image_url TEXT
      );

      CREATE TABLE IF NOT EXISTS weight_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        log_date DATE NOT NULL,
        weight REAL NOT NULL,
        UNIQUE(user_id, log_date)
      );

      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        name TEXT DEFAULT '',
        age INT,
        weight REAL,
        height REAL,
        gender TEXT DEFAULT 'male',
        calorie_goal INT DEFAULT 2000
      );

      CREATE TABLE IF NOT EXISTS favorite_meals (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        meal_type TEXT DEFAULT 'snack',
        total_calories INT DEFAULT 0,
        total_protein REAL DEFAULT 0,
        total_carbs REAL DEFAULT 0,
        total_fat REAL DEFAULT 0,
        total_fiber REAL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS exercise_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        log_date DATE NOT NULL,
        answer TEXT NOT NULL,
        UNIQUE(user_id, log_date)
      );
    `);

    // Ensure the unique constraint exists in case the table was created before it was added
    try {
      await client.query(`
        ALTER TABLE exercise_logs ADD CONSTRAINT exercise_logs_user_id_log_date_key UNIQUE (user_id, log_date);
      `);
    } catch (e) {
      // Ignore if the constraint already exists
    }

    console.log('✅ Database tables ready');
  } finally {
    if (client) client.release();
  }
}
