import { rolldown } from 'rolldown';
import { spawnSync } from 'node:child_process';
const bundle = await rolldown({ input: 'scripts/find-campaign-routes.ts', platform: 'node' });
await bundle.write({ file: '/tmp/bramble-campaign-solver.mjs', format: 'esm' });
await bundle.close();
const child = spawnSync(process.execPath, ['/tmp/bramble-campaign-solver.mjs', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(child.status ?? 1);
