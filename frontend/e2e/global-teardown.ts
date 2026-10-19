import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

export default function globalTeardown(): void {
  try {
    execSync('npm run cleanup:e2e', {
      cwd: resolve(process.cwd(), '../backend'),
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('E2E data cleanup failed:', err);
  }
}
