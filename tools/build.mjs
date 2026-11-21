// Bangun folder dist/ untuk Cloudflare Pages.
// Hanya file publik yang ikut: LP + assets + data + _headers.
import { cp, mkdir, rm, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = join(ROOT, 'dist');

const ENTRIES = [
  { from: 'index.html', to: 'index.html' },
  { from: 'assets', to: 'assets' },
  { from: 'data', to: 'data' },
  { from: '_headers', to: '_headers' }
];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const entry of ENTRIES) {
  const src = join(ROOT, entry.from);
  if (!existsSync(src)) {
    console.warn(`[build] lewati (tidak ada): ${entry.from}`);
    continue;
  }
  await cp(src, join(DIST, entry.to), { recursive: true });
}

// Penanda agar Pages tidak memproses sebagai Jekyll.
await writeFile(join(DIST, '.nojekyll'), '');

async function walk(dir, base = '') {
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${item.name}` : item.name;
    if (item.isDirectory()) out.push(...await walk(join(dir, item.name), rel));
    else out.push(rel);
  }
  return out;
}

const files = await walk(DIST);
console.log(`[build] dist/ siap — ${files.length} file`);
for (const file of files.sort()) console.log(`  ${file}`);
