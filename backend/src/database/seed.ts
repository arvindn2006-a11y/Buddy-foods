import { initDatabaseConnection } from '../config/db.js';
import { runMigrations, seedDefaultData } from './init.js';

async function main() {
  console.log('[Seed Script] Connecting to database...');
  await initDatabaseConnection();
  await runMigrations();
  console.log('[Seed Script] Seeding finished successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Seed Script Error]:', err);
  process.exit(1);
});
