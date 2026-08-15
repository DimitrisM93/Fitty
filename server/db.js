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
  const client = await pool.connect();
  try {
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
    `);
    console.log('✅ Database tables ready');
  } finally {
    client.release();
  }
}
