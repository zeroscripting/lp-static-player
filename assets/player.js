(() => {
  'use strict';

  const DEFAULTS = {
    defaultVideoId: 'CXdziPvQ1',
    cdnBase: 'https://cdn2.videy.co/',
    adTop: '827191cd94c85d5cf0eac55dd14a289d',
    adBottom: 'f8dc87b166ec94e379c69117491720e5',
    histats: '1,5020708,4,0,0,0,00010000'
  };

  const PRIMARY_CDNS = ['https://cdn2.videy.co/', 'https://cdn.videy.co/'];
  const OPTIONAL_CDNS = ['https://cdn.slicedrive.com/', 'https://cdn2.slicedrive.com/'];
  const FALLBACK_CDNS = PRIMARY_CDNS.slice();

  const cfg = { ...DEFAULTS, videos: [], cdnBases: PRIMARY_CDNS.slice(), slicedriveFallback: true };

  const params = new URLSearchParams(window.location.search);
  const rawId = (params.get('mov') || '').trim().replace(/\.mp4$/i, '');
  const hasValidQuery = /^[A-Za-z0-9_-]{1,80}$/.test(rawId);

  const preview = document.getElementById('previewVideo');
  const playButton = document.getElementById('playButton');
  const title = document.getElementById('videoTitle');
  const previewMessage = document.getElementById('previewMessage');
  const popupMessage = document.getElementById('popupMessage');

  let currentId = '';

  function isId(value) {
    return /^[A-Za-z0-9_-]{1,80}$/.test(value || '');
  }

  function resolveId() {
    const requested = hasValidQuery ? rawId : cfg.defaultVideoId;
    const entry = cfg.videos.find((video) => video && video.id === requested);
    if (entry && entry.active === false) return cfg.defaultVideoId;
    return requested;
  }

  function normalizeBase(base) {
    const trimmed = String(base || '').trim();
    if (!/^https?:\/\//i.test(trimmed)) return '';
    return /\/$/.test(trimmed) ? trimmed : `${trimmed}/`;
  }

  // Urutan CDN: cdnBases dari config, lalu cdnBase tunggal, lalu default.
  // Kalau slicedriveFallback aktif, domain SliceDrive ditambahkan di ujung.
  function cdnList() {
    const list = [];
    const push = (base) => {
      const normalized = normalizeBase(base);
      if (normalized && !list.includes(normalized)) list.push(normalized);
    };
    cfg.cdnBases.forEach(push);
    push(cfg.cdnBase);
    FALLBACK_CDNS.forEach(push);
    if (cfg.slicedriveFallback) OPTIONAL_CDNS.forEach(push);
    return list;
  }

  function urlsFor(id) {
    const safeId = String(id || '').replace(/\.mp4$/i, '');
    return cdnList().map((base) => `${base}${encodeURIComponent(safeId)}.mp4`);
  }

  function videoUrlFor(id) {
    return urlsFor(id)[0];
  }

  let cdnIndex = 0;

  function setVideo(id, force) {
    if (!isId(id)) return;
    if (id === currentId && !force) return;
    currentId = id;
    cdnIndex = 0;
    title.textContent = `Video: ${id}`;
    preview.style.opacity = '';
    previewMessage.hidden = true;
    preview.src = urlsFor(id)[0];
  }

  preview.addEventListener('loadedmetadata', () => {
    const seekTo = Number.isFinite(preview.duration)
      ? Math.min(0.1, Math.max(0, preview.duration - 0.01))
      : 0.1;
    try { preview.currentTime = seekTo; } catch (_) { /* Thumbnail opsional. */ }
  });

  preview.addEventListener('error', () => {
    // Coba CDN berikutnya sebelum menyerah.
    const urls = urlsFor(currentId);
    if (cdnIndex + 1 < urls.length) {
      cdnIndex += 1;
      preview.src = urls[cdnIndex];
      return;
    }
    preview.style.opacity = '0';
    previewMessage.hidden = false;
  });

  function applyConfig(data) {
    if (!data || typeof data !== 'object') return;
    const site = data.site && typeof data.site === 'object' ? data.site : {};
    const ads = data.ads && typeof data.ads === 'object' ? data.ads : {};

    if (isId(site.defaultVideoId)) cfg.defaultVideoId = site.defaultVideoId;
    if (typeof site.cdnBase === 'string' && /^https?:\/\//i.test(site.cdnBase)) {
      cfg.cdnBase = site.cdnBase;
      cfg.cdnBases = [normalizeBase(site.cdnBase)].filter(Boolean);
    }
    if (Array.isArray(site.cdnBases)) {
      const list = site.cdnBases.map(normalizeBase).filter(Boolean);
      if (list.length) {
        cfg.cdnBases = list;
        cfg.cdnBase = list[0];
      }
    }
    if (typeof site.slicedriveFallback === 'boolean') {
      cfg.slicedriveFallback = site.slicedriveFallback;
    }
    if (typeof site.title === 'string' && site.title.trim()) {
      document.title = `${site.title.trim()} — Preview`;
    }
    if (/^[a-f0-9]{32}$/i.test(ads.top || '')) cfg.adTop = ads.top;
    if (/^[a-f0-9]{32}$/i.test(ads.bottom || '')) cfg.adBottom = ads.bottom;
    if (/^[0-9a-z,]+$/i.test(ads.histats || '')) cfg.histats = ads.histats;

    if (Array.isArray(data.videos)) {
      cfg.videos = data.videos.filter((video) => video && isId(video.id));
    }
  }

  function buildPlayerHtml() {
    const videoId = currentId || resolveId();
    const videoUrls = urlsFor(videoId);
    const videoUrl = videoUrls[0];
    const videoUrlsJson = JSON.stringify(videoUrls).replace(/</g, '\\u003c');
    const adTop = cfg.adTop;
    const adBottom = cfg.adBottom;
    const histatsId = cfg.histats;

    // Video URL hanya dibuat dari ID yang sudah divalidasi.
    // Key iklan dan Histats dibaca dari data/config.json.
    return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#000000">
  <title>BABACAN MEDIA — Video Player</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      width: 100%;
      min-height: 100%;
      overflow-x: hidden;
      background: #000;
      color: #fff;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      padding: 12px 6px;
      -webkit-text-size-adjust: 100%;
    }
    main {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .ad-slot {
      width: 100%;
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      overflow: hidden;
    }
    .ad-top { min-height: 50px; }
    .ad-bottom { min-height: 250px; }
    .video-block { width: 100%; max-width: 450px; min-width: 0; }
    video {
      display: block;
      width: 100%;
      height: auto;
      max-height: 75vh;
      max-height: 75dvh;
      object-fit: contain;
      background: #000;
      border-radius: 6px;
    }
    #videoError {
      display: none;
      margin: 12px 8px 0;
      padding: 12px;
      border: 1px solid #555;
      border-radius: 6px;
      background: #191919;
      font-size: 14px;
      line-height: 1.5;
    }
    #videoError a { color: #91c8ff; }
    /* Mobile: player mengisi lebar HP, tinggi menyesuaikan layar.
       Iklan bawah bisa digulir agar video tidak diperkecil secara paksa. */
    @media (max-width: 600px) {
      body { padding: 0; }
      main { max-width: none; gap: 8px; }
      .ad-top { padding-top: 4px; }
      .video-block { max-width: none; width: 100%; }
      video {
        width: 100%;
        height: auto;
        max-height: calc(100vh - 80px);
        max-height: calc(100dvh - 80px);
        object-fit: contain;
        border-radius: 0;
      }
      .ad-bottom { padding-bottom: 8px; }
    }
    /* HP landscape: batasi tinggi video sesuai ruang layar. */
    @media (max-height: 520px) and (orientation: landscape) {
      video { max-height: 70vh; max-height: 70dvh; }
    }
  </style>
</head>
<body>
  <main>
    <div class="ad-slot ad-top" aria-label="Iklan atas">
      <script>
        atOptions = {
          'key': '${adTop}',
          'format': 'iframe',
          'height': 50,
          'width': 320,
          'params': {}
        };
      </script>
      <script src="https://bancadeltempoidea.org/22/${adTop}"></script>
    </div>

    <div class="video-block">
      <video id="player" controls autoplay muted playsinline preload="metadata"
             src="${videoUrl}">
        Browser Anda tidak mendukung video HTML5.
      </video>
      <div id="videoError" role="alert">
        Video gagal dimuat. Periksa CDN atau
        <a href="${videoUrl}" target="_blank" rel="noopener noreferrer">buka MP4 langsung</a>.
      </div>
    </div>

    <div class="ad-slot ad-bottom" aria-label="Iklan bawah">
      <script>
        atOptions = {
          'key': '${adBottom}',
          'format': 'iframe',
          'height': 250,
          'width': 300,
          'params': {}
        };
      </script>
      <script src="https://bancadeltempoidea.org/22/${adBottom}"></script>
    </div>
  </main>

  <script>
    var _Hasync = window._Hasync || [];
    _Hasync.push(['Histats.start', '${histatsId}']);
    _Hasync.push(['Histats.fasi', '1']);
    _Hasync.push(['Histats.track_hits', '']);
    (function () {
      var hs = document.createElement('script');
      hs.async = true;
      hs.src = 'https://s10.histats.com/js15_as.js';
      document.head.appendChild(hs);
    })();
  </script>
  <noscript>
    <a href="/" target="_blank" rel="noopener noreferrer">
      <img src="https://sstatic1.histats.com/0.gif?${String(histatsId).split(',')[1] || ''}&amp;101" alt="Histats">
    </a>
  </noscript>
  <script>
    (function () {
      var player = document.getElementById('player');
      var error = document.getElementById('videoError');
      var sources = ${videoUrlsJson};
      var index = 0;

      // Kalau CDN utama gagal (mis. diblokir ISP), coba CDN berikutnya.
      player.addEventListener('error', function () {
        if (index + 1 < sources.length) {
          index += 1;
          player.src = sources[index];
          var retry = player.play();
          if (retry && typeof retry.catch === 'function') retry.catch(function () {});
          return;
        }
        error.style.display = 'block';
      });

      var attempt = player.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () { /* Pengunjung tetap bisa memakai kontrol Play. */ });
      }
    })();
  </script>
</body>
</html>`;
  }

  playButton.addEventListener('click', () => {
    popupMessage.hidden = true;

    // Harus langsung dari event klik; jangan tunda dengan setTimeout/await.
    const newTab = window.open('about:blank', '_blank');
    if (!newTab) {
      popupMessage.hidden = false;
      return;
    }

    try {
      // Tidak ada navigasi ke /watch.html ataupun URL Blob.
      // Pada about:blank, document.write diperlukan untuk memasang HTML utuh
      // dan memungkinkan tag script iklan dijalankan sebagai parser-inserted.
      newTab.document.open();
      newTab.document.write(buildPlayerHtml());
      newTab.document.close();
      // Jaga agar script pihak ketiga di tab baru tidak dapat mengontrol tab asal.
      newTab.opener = null;
    } catch (error) {
      console.error('Gagal membuat halaman video:', error);
      popupMessage.textContent = 'Browser membatasi halaman baru. Coba buka di browser utama.';
      popupMessage.hidden = false;
      try { newTab.close(); } catch (_) { /* no-op */ }
    }
  });

  setVideo(resolveId());

  fetch('data/config.json', { cache: 'no-store' })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      if (!data) return;
      applyConfig(data);
      // Config datang belakangan: paksa muat ulang dengan CDN dari config.
      setVideo(resolveId(), true);
    })
    .catch(() => { /* Pakai default bawaan. */ });
})();
