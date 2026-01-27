import pool from '../pool.mjs';

async function getUniqueCols(table) {
  const query = `
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema    = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name   = $1
      AND tc.constraint_type = 'UNIQUE'
  `;

  const result = await pool.query(query, [table]);
  console.log(result.rows.map(row => row.column_name));
  await pool.end();
}

const tableName = process.argv[2];
if (!tableName) {
  console.error('Usage: node get_unique_cols.mjs <table_name>');
  process.exit(1);
}

getUniqueCols(tableName);

