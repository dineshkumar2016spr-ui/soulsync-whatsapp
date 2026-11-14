// Copies the static app into web/ for Netlify (publish dir) and Capacitor (webDir).
// Cross-platform: replaces the previous shell `cp` chain so the Netlify Linux build works.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const web = path.join(root, 'web');
fs.mkdirSync(web, { recursive: true });

const files = [
  'index.html',
  'parse-worker.js',
  'sw.js',
  'manifest.json',
  'TERMS.html',
  'PRIVACY.html',
  'dpdp.html',
  'agent.png',
  'flirts.png',
  'lang.png',
  'screenshot.png',
  'node_modules/jszip/dist/jszip.min.js'
];

for (const rel of files) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) { console.warn('[build-web] skip missing', rel); continue; }
  fs.copyFileSync(src, path.join(web, path.basename(rel)));
}

// The frontend has no bundler, so the API base URL is baked into web/config.js at build time.
const apiBase = (process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || '').trim().replace(/\/+$/, '');
let conf = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
if (apiBase) conf = conf.replace("apiBaseUrl: ''", `apiBaseUrl: ${JSON.stringify(apiBase)}`);
fs.writeFileSync(path.join(web, 'config.js'), conf);

console.log(`[build-web] copied ${files.length} files into web/ (apiBaseUrl: ${apiBase || 'relative'})`);

// Capacitor sync is local-only; Netlify sets CAP_SYNC=0.
if (process.env.CAP_SYNC !== '0') {
  const r = spawnSync('npx cap sync', { stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
}
