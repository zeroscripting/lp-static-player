import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const CONFIG_FILE = join(ROOT, 'data', 'config.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

function safePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch (_) {
    return null;
  }
  // Tolak traversal sebelum normalisasi: '..' di segmen mana pun.
  if (decoded.split(/[/\\]/).some((segment) => segment === '..')) return null;
  const clean = normalize(decoded).replace(/^([/\\])+/, '');
  if (clean.split(/[/\\]/).some((segment) => segment === '..')) return null;
  const resolved = join(ROOT, clean);
  if (resolved !== ROOT && !resolved.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) return null;
  return resolved;
}

async function tryFile(path) {
  try {
    const info = await stat(path);
    if (info.isFile()) return { path, size: info.size };
    if (info.isDirectory()) {
      const index = join(path, 'index.html');
      const idxInfo = await stat(index).catch(() => null);
      if (idxInfo && idxInfo.isFile()) return { path: index, size: idxInfo.size };
    }
  } catch (_) { /* tidak ada */ }
  return null;
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Body terlalu besar'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function handleLocalConfig(req, res) {
  // Hanya untuk dev lokal: tulis data/config.json langsung ke disk.
  if (req.method === 'GET') {
    try {
      const raw = await readFile(CONFIG_FILE, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(raw);
    } catch (_) {
      json(res, 404, { error: 'config.json belum ada' });
    }
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (err) {
      json(res, 400, { error: `JSON tidak valid: ${err.message}` });
      return;
    }

    if (!payload || typeof payload !== 'object') {
      json(res, 400, { error: 'Payload harus objek' });
      return;
    }

    payload.updatedAt = new Date().toISOString();
    const text = `${JSON.stringify(payload, null, 2)}\n`;
    try {
      await writeFile(CONFIG_FILE, text, 'utf8');
      json(res, 200, { ok: true, updatedAt: payload.updatedAt });
      console.log(`[local] config.json ditulis (${text.length} byte)`);
    } catch (err) {
      json(res, 500, { error: `Gagal menulis: ${err.message}` });
    }
    return;
  }

  json(res, 405, { error: 'Method tidak didukung' });
}

const server = createServer(async (req, res) => {
  const urlPath = req.url || '/';

  if (urlPath.split('?')[0] === '/__local/config') {
    await handleLocalConfig(req, res);
    return;
  }

  const target = safePath(urlPath);

  if (!target) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  // Root selalu index.html supaya /?mov=<id> tetap bekerja seperti di produksi.
  const file = await tryFile(target);

  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const body = await readFile(file.path);
  res.writeHead(200, {
    'Content-Type': MIME[extname(file.path).toLowerCase()] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
});

server.listen(PORT, () => {
  console.log(`LP local dev  ->  http://localhost:${PORT}/?mov=9Opq7MXm1`);
  console.log(`Dashboard     ->  http://localhost:${PORT}/admin/`);
  console.log(`Root dir      ->  ${ROOT}`);
});
