// Uji extractVideoId dengan berbagai bentuk input.
const extractVideoId = (input) => {
  let value = String(input || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const fromQuery = url.searchParams.get('id') || url.searchParams.get('mov');
      if (fromQuery) value = fromQuery;
      else value = url.pathname.split('/').filter(Boolean).pop() || '';
    } catch (_) {
      return '';
    }
  }
  return value.trim().replace(/\.mp4$/i, '');
};

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

const cases = [
  'jzvGRGGb1',
  '  jzvGRGGb1  ',
  'jzvGRGGb1.mp4',
  'https://videy.co/v/?id=jzvGRGGb1',
  'https://videy.co/v/?id=jzvGRGGb1&foo=1',
  'https://cdn2.videy.co/jzvGRGGb1.mp4',
  'https://cdn.videy.co/jzvGRGGb1.mp4',
  'https://cdn.slicedrive.com/jzvGRGGb1.mp4',
  'http://localhost:3000/?mov=jzvGRGGb1',
  'https://amjx.pages.dev/?mov=9Opq7MXm1',
  'https://videy.co/',
  'javascript:alert(1)',
  'jzv GRG Gb1',
  ''
];

for (const input of cases) {
  const id = extractVideoId(input);
  const valid = ID_RE.test(id);
  console.log(`${valid ? 'OK  ' : 'FAIL'}  ${JSON.stringify(input).padEnd(58)} -> ${JSON.stringify(id)}`);
}
