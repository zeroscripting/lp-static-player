// Ukur overflow horizontal dashboard lewat Chrome DevTools Protocol.
// Pakai: node tools/measure.mjs http://localhost:3000/admin/#site
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const URL_TARGET = process.argv[2] || 'http://localhost:3000/admin/#site';
const PORT = 9333;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=' + process.env.TEMP + '\\cdp-profile-' + Date.now(),
  '--window-size=390,900',
  'about:blank'
], { stdio: 'ignore' });

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (_) { /* belum siap */ }
    await sleep(250);
  }
  throw new Error('Chrome tidak siap');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  }
};

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const msgId = ++id;
  pending.set(msgId, { resolve, reject });
  ws.send(JSON.stringify({ id: msgId, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url: URL_TARGET });
await sleep(2500);

const expr = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > vw + 1) {
      out.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: el.className && typeof el.className === 'string' ? el.className : null,
        right: Math.round(r.right),
        width: Math.round(r.width),
        scrollW: el.scrollWidth
      });
    }
  }
  return JSON.stringify({
    viewport: vw,
    docScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: out.slice(0, 15)
  }, null, 2);
})()`;

const result = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
console.log(result.result.value);

ws.close();
chrome.kill();
