import {spawnSync} from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, {stdio: 'inherit'});
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}

// Vercel can reach the managed database even when a local workspace cannot.
// Fail the deployment if a configured database cannot be migrated.
if (process.env.DATABASE_URL) run(process.execPath, ['scripts/migrate.mjs']);
if (process.env.PLAYCOACH_CHECK_ACCOUNT_URL) run(process.execPath, ['scripts/check-account.mjs', process.env.PLAYCOACH_CHECK_ACCOUNT_URL]);
run('npm', ['run', 'build']);
