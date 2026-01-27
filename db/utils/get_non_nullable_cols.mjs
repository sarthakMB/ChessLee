import pool from '../pool.mjs';

async function getNonNullCols(table) {
  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND is_nullable = 'NO'
  `;

  const result = await pool.query(query, [table]);
  console.log(result.rows.map(row => row.column_name));
  await pool.end();
}

const tableName = process.argv[2];
if (!tableName) {
  console.error('Usage: node get_non_nullable_cols.mjs <table_name>');
  process.exit(1);
}

getNonNullCols(tableName);