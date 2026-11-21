import { readFile } from 'node:fs/promises';

const src = await readFile(new URL('../assets/player.js', import.meta.url), 'utf8');
const cfg = JSON.parse(await readFile(new URL('../data/config.json', import.meta.url), 'utf8'));

const parseList = (name) => JSON.parse(
  (src.match(new RegExp(`${name}\\s*=\\s*(\\[[^\\]]*\\])`)) || [, '[]'])[1].replace(/'/g, '"')
);

const PRIMARY = parseList('PRIMARY_CDNS');
const OPTIONAL = parseList('OPTIONAL_CDNS');

const norm = (b) => {
  const t = String(b || '').trim();
  if (!/^https?:\/\//i.test(t)) return '';
  return /\/$/.test(t) ? t : t + '/';
};

function cdnList(site) {
  const list = [];
  const push = (b) => { const n = norm(b); if (n && !list.includes(n)) list.push(n); };
  (site.cdnBases || []).forEach(push);
  push(site.cdnBase);
  PRIMARY.forEach(push);
  if (site.slicedriveFallback !== false) OPTIONAL.forEach(push);
  return list;
}

const id = process.argv[2] || (cfg.videos[0] && cfg.videos[0].id) || cfg.site.defaultVideoId;
const bases = cdnList(cfg.site);

console.log('=== config ===');
console.log('cdnBase            :', cfg.site.cdnBase);
console.log('cdnBases           :', cfg.site.cdnBases);
console.log('slicedriveFallback :', cfg.site.slicedriveFallback !== false);
console.log('\n=== urutan CDN untuk id:', id, '===');

let ok = null;
for (const [i, base] of bases.entries()) {
  const url = `${base}${encodeURIComponent(id)}.mp4`;
  let line = ` ${i + 1}. ${url}`;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const len = res.headers.get('content-length');
    line += `  -> ${res.status} ${len ? Number(len).toLocaleString('id-ID') + ' byte' : ''}`;
    if (res.ok && !ok) ok = url;
  } catch (err) {
    const msg = String(err.cause && err.cause.code ? err.cause.code : err.message);
    line += `  -> GAGAL (${msg})`;
  }
  console.log(line);
}

console.log('\nPlayer akan memakai:', ok || '(semua gagal)');
