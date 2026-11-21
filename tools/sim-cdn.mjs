// Simulasi logika fallback CDN tanpa browser.
import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../assets/player.js', import.meta.url), 'utf8');

const norm = (b) => {
  const t = String(b || '').trim();
  if (!/^https?:\/\//i.test(t)) return '';
  return /\/$/.test(t) ? t : t + '/';
};

const parseList = (name) => JSON.parse((src.match(new RegExp(`${name}\\s*=\\s*(\\[[^\\]]*\\])`)) || [, '[]'])[1].replace(/'/g, '"'));
const FALLBACK = parseList('PRIMARY_CDNS');
const OPTIONAL = parseList('OPTIONAL_CDNS');
console.log('PRIMARY:', FALLBACK, '\nOPTIONAL:', OPTIONAL);

function cdnList(cfg) {
  const list = [];
  const push = (b) => { const n = norm(b); if (n && !list.includes(n)) list.push(n); };
  cfg.cdnBases.forEach(push);
  push(cfg.cdnBase);
  FALLBACK.forEach(push);
  if (cfg.slicedriveFallback) OPTIONAL.forEach(push);
  return list;
}

const urlsFor = (cfg, id) => {
  const safeId = String(id || '').replace(/\.mp4$/i, '');
  return cdnList(cfg).map((b) => `${b}${encodeURIComponent(safeId)}.mp4`);
};

const cases = [
  { name: 'config normal (slice on)', cfg: { cdnBase: 'https://cdn2.videy.co/', cdnBases: ['https://cdn2.videy.co/', 'https://cdn.videy.co/'], slicedriveFallback: true } },
  { name: 'slice off', cfg: { cdnBase: 'https://cdn2.videy.co/', cdnBases: ['https://cdn2.videy.co/', 'https://cdn.videy.co/'], slicedriveFallback: false } },
  { name: 'cdnBases kosong', cfg: { cdnBase: 'https://cdn2.videy.co/', cdnBases: [], slicedriveFallback: true } },
  { name: 'cdnBase tanpa slash', cfg: { cdnBase: 'https://cdn2.videy.co', cdnBases: [], slicedriveFallback: false } },
  { name: 'cdnBase invalid', cfg: { cdnBase: 'javascript:alert(1)', cdnBases: [], slicedriveFallback: true } },
  { name: 'duplikat', cfg: { cdnBase: 'https://cdn2.videy.co/', cdnBases: ['https://cdn2.videy.co/', 'https://cdn2.videy.co'], slicedriveFallback: false } }
];

for (const c of cases) {
  console.log(`\n[${c.name}]`);
  urlsFor(c.cfg, 'jzvGRGGb1').forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
}

// ID berbahaya harus di-encode
console.log('\n[id aneh]');
console.log('  ', urlsFor(cases[0].cfg, 'a b/c.mp4')[0]);
