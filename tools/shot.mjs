// Screenshot akurat via CDP (viewport CSS px, tanpa scrollbar).
// Pakai: node tools/shot.mjs <url> <lebar> <tinggi> <file.png>
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const [url = 'http://localhost:3000/admin/#site', w = '390', h = '900', out = '.shot.png'] = process.argv.slice(2);
const PORT = 9334;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\cdp-shot-' + Date.now(),
  'about:blank'
], { stdio: 'ignore' });

async function wsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error('Chrome tidak siap');
}

const ws = new WebSocket(await wsUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

const width = Number(w);
const height = Number(h);

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width, height, deviceScaleFactor: 1, mobile: width < 600
});
await send('Page.navigate', { url });
await sleep(2600);

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
await writeFile(out, Buffer.from(shot.data, 'base64'));
console.log(`${out} ${width}x${height}`);

ws.close();
chrome.kill();
