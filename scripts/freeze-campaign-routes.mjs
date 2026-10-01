import { readFileSync, writeFileSync } from 'node:fs';
const routes = JSON.parse(readFileSync('scripts/campaign-routes-v6.json', 'utf8'));
writeFileSync('src/campaign-routes-v6.ts', '// Recorded through the real collision path. Ordinary shots and free swaps only.\n// Regenerate candidates with scripts/find-campaign-routes.mjs, then verify tests.\nexport const campaignRoutesV6: Record<number, string> = ' + JSON.stringify(routes, null, 2) + ';\n');
