const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("UPDATE users SET role = 'superadmin' WHERE email = 'saxagenia@gmail.com'", (err, res) => {
  if (err) console.error(err);
  else console.log('Rows updated:', res.rowCount);
  pool.end();
});
