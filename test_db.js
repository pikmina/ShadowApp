import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query("SELECT * FROM characters LIMIT 1");
  if (res.rows.length > 0) {
    console.log(JSON.stringify(res.rows[0].profile_data, null, 2));
  }
  pool.end();
}
check();
