import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../pool.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration runner for Chess App
 *
 * Why migrations?
 * - Version control for database schema
 * - Reproducible deployments
 * - Team collaboration (everyone has same schema)
 * - Rollback capability (if we add down migrations later)
 */

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
  console.log('✓ Migrations tracking table ready');
}

async function getExecutedMigrations() {
  const result = await pool.query(
    'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
  );
  return new Set(result.rows.map(row => row.migration_name));
}

async function markMigrationAsExecuted(migrationName) {
  await pool.query(
    'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
    [migrationName]
  );
}

async function runMigration(filePath, migrationName) {
  console.log(`\nRunning: ${migrationName}`);

  const sql = await fs.readFile(filePath, 'utf-8');

  // Execute the migration in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
      [migrationName]
    );
    await client.query('COMMIT');
    console.log(`✓ ${migrationName} completed`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function migrate() {
  try {
    console.log('Starting database migration...\n');

    // Ensure migrations table exists
    await createMigrationsTable();

    // Get list of already executed migrations
    const executed = await getExecutedMigrations();

    // Read all .sql files from migrations directory
    const files = await fs.readdir(__dirname);
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort(); // Alphabetical order (001, 002, etc.)

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    let ranCount = 0;

    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');

      if (executed.has(migrationName)) {
        console.log(`⊘ ${migrationName} (already executed)`);
        continue;
      }

      const filePath = path.join(__dirname, file);
      await runMigration(filePath, migrationName);
      ranCount++;
    }

    console.log('\n' + '='.repeat(50));
    if (ranCount === 0) {
      console.log('Database is up to date. No migrations needed.');
    } else {
      console.log(`Migration complete! Ran ${ranCount} migration(s).`);
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
migrate();
