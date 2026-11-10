// Rasm qismi: fon (gradient) + naqsh (halqalar) + model (Lottie), konfeti.
const LOTTIE_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';
export const pad2 = (n) => String(n).padStart(2, '0');
export const pad3 = (n) => String(n).padStart(3, '0');

let CAT = null;
export async function catalog() {
  if (!CAT) CAT = await (await fetch('data/catalog.json')).json();
  return CAT;
}

const imgs = new Map();
export function loadImg(src) {
  if (!imgs.has(src)) imgs.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return imgs.get(src);
}

const models = new Map();
const CH = 6;   // bitta paketdagi modellar soni (tools/pack_models.py bilan bir xil)
const packs = new Map();
function loadPack(pre, c) {
  const key = pre + 'p' + c;
  if (!packs.has(key)) packs.set(key, (async () => {
    const r = await fetch(`models/${pre}p${c}.bin`);
    if (!r.ok) throw new Error('paket yo‘q');
    const b = new Uint8Array(await r.arrayBuffer()), dv = new DataView(b.buffer);
    const n = dv.getUint32(0, true); let off = 4 + 4 * n; const out = [];
    for (let j = 0; j < n; j++) { const l = dv.getUint32(4 + 4 * j, true); out.push(b.subarray(off, off + l)); off += l; }
    return out;
  })().catch((e) => { packs.delete(key); throw e; }));
  return packs.get(key);
}
const gunzip = async (buf) => JSON.parse(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
export function loadModel(i, k = 0) {
  const pre = ['', 'c', 'd', 'e'][k || 0] ?? `g${k}_`;   // k=0 — Plush Pepe, k=1 — Durov’s Cap (c), k=2 — B-Day Candle (d), k=3 — Desk Calendar (e), qolganlari gK_
  const key = pre + i;
  if (!models.has(key)) models.set(key, (async () => {
    if (i !== 'base') {
      try { const bl = (await loadPack(pre, Math.floor(i / CH)))[i % CH]; if (bl) return await gunzip(bl); } catch (e) {}
    }
    const r = await fetch(`models/${pre}${i === 'base' ? 'base' : pad2(i)}.bin`);   // paketlanmagan alohida fayl (zaxira)
    if (!r.ok) throw new Error('model yo‘q');
    return gunzip(await r.arrayBuffer());
  })().catch((e) => { models.delete(key); throw e; }));
  return models.get(key);
}

let lp = null;
export function getLottie() {
  if (window.lottie) return Promise.resolve(window.lottie);
  if (!lp) lp = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = LOTTIE_SRC;
    s.onload = () => res(window.lottie); s.onerror = () => { lp = null; rej(new Error('lottie yuklanmadi')); };
    document.head.appendChild(s);
  });
  return lp;
}


// ---- Animatsiya boshqaruvi: barcha Lottie shu yerdan yonadi/to'xtaydi.
// Animatsiya faqat: foydalanuvchi yoqgan + qurilma sekinlashmagan + server "lite" demagan + ekran ochiq bo'lsa ishlaydi.
export const ANIM = { user: false, lite: false, server: false, hidden: false, vip: false };
// VIP (doimiy animatsiya): qurilma/server "lite" desa ham, foydalanuvchi o'chirgan bo'lsa ham animatsiya to'xtamaydi (faqat ekran yopiq bo'lsa to'xtaydi).
export const animOn = () => !ANIM.hidden && (ANIM.vip || (ANIM.user && !ANIM.lite && !ANIM.server));
export function setVip(v) { ANIM.vip = !!v; if (ANIM.vip) { ANIM.lite = false; try { localStorage.removeItem(LKEY); } catch (e) {} } schedule(); }
const MAX_PLAY = 5;                    // bir vaqtda ko'pi bilan nechta animatsiya yursin
const LKEY = 'lite_until';
const items = new Set(); let onLite = () => {}, planned = false, playingCount = 0, monRun = false;
try { if (+localStorage.getItem(LKEY) > Date.now()) ANIM.lite = true; } catch (e) {}
export const animEvents = (f) => { onLite = f; };
export function clearLocalLite() { ANIM.lite = false; try { localStorage.removeItem(LKEY); } catch (e) {} schedule(); }
export function setUserAnim(v) { ANIM.user = !!v; schedule(); }
export function setServerLite(v) { ANIM.server = !!v; schedule(); }
function setLite() {
  if (ANIM.lite || ANIM.vip) return; ANIM.lite = true;
  try { localStorage.setItem(LKEY, String(Date.now() + 6 * 3600e3)); } catch (e) {}
  schedule(); try { onLite(); } catch (e) {}
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { es.forEach((e) => { if (e.target._it) e.target._it.vis = e.isIntersecting; }); schedule(); }, { rootMargin: '60px' }) : null;
export function track(an, box, o = {}) {
  const it = { an, box, force: !!o.force, still: !!o.still, poster: o.poster || 0, vis: true, playing: false, parked: false, dc: 0 };
  items.add(it); if (io) { box._it = it; io.observe(box); }
  schedule(); return it;
}
export function untrack(it) { if (!it) return; items.delete(it); if (io) { try { io.unobserve(it.box); } catch (e) {} } }
export function schedule() { if (planned) return; planned = true; requestAnimationFrame(apply); }
function apply() {
  planned = false;
  const on = animOn(); let n = 0;
  if (document.body) document.body.classList.toggle('noanim', !on);
  items.forEach((it) => {
    if (!it.box.isConnected) {            // ekrandan olib tashlangan: animatsiyani o'chirib, xotirani bo'shatamiz
      if (++it.dc >= 3) { try { it.an.destroy(); } catch (e) {} untrack(it); }
      return;
    }
    it.dc = 0;
    const want = (on || (it.force && !ANIM.hidden)) && !it.still && it.vis && n < (ANIM.vip ? 8 : MAX_PLAY);   // force: sotib olish oynasidagi asosiy sovg'a har doim jonli
    if (want) { n++; if (!it.playing) { try { it.an.play(); } catch (e) {} it.playing = true; it.parked = false; } }
    else if (it.playing || !it.parked) { try { it.an.goToAndStop(it.poster, true); } catch (e) {} it.playing = false; it.parked = true; }
  });
  playingCount = n; if (n) monitor();
}
document.addEventListener('visibilitychange', () => { ANIM.hidden = document.hidden; schedule(); });
setInterval(() => { if (items.size) schedule(); }, 4000);
// Qurilma qotsa (kadr tezligi ~38 dan past, 2 marta ketma-ket) animatsiya avtomatik o'chadi
function monitor() {
  if (monRun) return; monRun = true;
  let t0 = performance.now(), last = t0, n = 0, bad = 0;
  const f = (t) => {
    if (!playingCount || !animOn()) { monRun = false; return; }
    if (t - last > 500) { t0 = t; n = 0; bad = 0; }   // tab o'chib turgan bo'lsa, o'lchovni qayta boshlaymiz
    last = t; n++;
    if (t - t0 >= 2000) { const fps = n * 1000 / (t - t0); bad = fps < 38 ? bad + 1 : 0; n = 0; t0 = t; if (bad >= 2) { monRun = false; setLite(); return; } }
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
}

// ---- ranglar
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const lum = (h) => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
export const mixHex = mix;
export function patColor(bd) { return lum(bd.e) < 70 ? mix(bd.e, '#ffffff', 0.38) : bd.k; }

export function drawGradient(cv, c, e) {
  const W = cv.width, H = cv.height, x = cv.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, c); g.addColorStop(1, e);
  x.clearRect(0, 0, W, H); x.fillStyle = g; x.fillRect(0, 0, W, H);
}

const tints = new Map();
function tinted(img, color, key) {
  const k = key + color;
  if (!tints.has(k)) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, 96, 96);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, 96, 96);
    tints.set(k, c);
  }
  return tints.get(k);
}

// Telegram'dagidek: markazdan chetga gradient, ustida naqsh halqalari (chetga qarab xiralashadi)
// Telegramdagidek: kam (37 ta), kichik va xira naqshlar. Ichkaridagisi biroz aniqroq, tashqarisi sekin so'nadi.
const RINGS = [
  { r: 0.52, n: 7, s: 0.075, a: 0.30, o: 0.05 },
  { r: 0.82, n: 12, s: 0.068, a: 0.21, o: 0.17 },
  { r: 1.08, n: 18, s: 0.060, a: 0.13, o: 0.03 },
];
export async function drawBackdrop(cv, b, p, fade = false) {
  const tok = (cv._tok = (cv._tok || 0) + 1);
  const bd = CAT.backdrops[b];
  const [bg, pi] = await Promise.all([loadImg(`bd/${pad2(b)}.jpg`), loadImg(`pt/${pad3(p)}.png`)]);
  if (tok !== cv._tok) return;
  const W = cv.width, H = cv.height, x = cv.getContext('2d');
  if (fade && cv._has) { // eski fonni yumshoq yo'qotish (crossfade)
    const g = cv.cloneNode(false); g.getContext('2d').drawImage(cv, 0, 0); g.className = 'ghost';
    cv.after(g); requestAnimationFrame(() => g.classList.add('out')); setTimeout(() => g.remove(), 380);
  }
  cv._has = true;
  x.clearRect(0, 0, W, H); x.drawImage(bg, 0, 0, W, H);
  const t = tinted(pi, patColor(bd), 'p' + p);
  for (const R of RINGS) {
    x.globalAlpha = R.a;
    const sz = R.s * H;
    for (let k = 0; k < R.n; k++) {
      const ang = (k / R.n + R.o) * Math.PI * 2;
      const cx = W / 2 + Math.cos(ang) * R.r * W / 2, cy = H / 2 + Math.sin(ang) * R.r * H / 2;
      x.save(); x.translate(cx, cy); x.rotate(ang + Math.PI / 2 * (k % 2 ? 0.25 : -0.25));
      x.drawImage(t, -sz / 2, -sz / 2, sz, sz); x.restore();
    }
  }
  x.globalAlpha = 1;
}

// ---- vizual (fon + model)
// Ekrandan ~1400px uzoqdagi kartalar uxlaydi, yaqinlashganda uyg'onadi
const sleepIO = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { es.forEach((e) => { const v = e.target._v; if (!v) return; if (e.isIntersecting) v.wake(); else v.sleep(); }); }, { rootMargin: '1400px 0px' }) : null;
export function visual(w = 300, h = w) {
  const el = document.createElement('div'); el.className = 'vis';
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const mdl = document.createElement('div'); mdl.className = 'mdl';
  el.append(cv, mdl);
  const v = {
    el, cv, mdl, anim: null, _t: 0,
    plain(c = '#dff3d8', e = '#9bd68f') { v._bd = ['p', c, e]; if (v._sl) return; cv._tok = (cv._tok || 0) + 1; drawGradient(cv, c, e); },
    backdrop(b, p, fade = false) { v._bd = ['b', b, p]; if (v._sl) return; return drawBackdrop(cv, b, p, fade); },
    async model(i, loop = true, still = false, roll = false, k = 0, force = false) {
      v._m = [i, loop, still, k, force];
      const tok = ++v._t;
      if (v._sl) return;      // uxlab turibdi: uyg'onganda yaratiladi
      try {
        const [L, data] = await Promise.all([getLottie(), loadModel(i, k)]);
        if (tok !== v._t) return;
        const holder = document.createElement('div'); holder.style.cssText = 'width:100%;height:100%';
        if (v.anim) { untrack(v.it); try { v.anim.destroy(); } catch (e) {} }
        mdl.replaceChildren(holder);
        if (roll) { mdl.classList.remove('mroll'); void mdl.offsetWidth; mdl.classList.add('mroll'); }
        v.anim = L.loadAnimation({ container: holder, renderer: 'svg', loop, autoplay: false, animationData: structuredClone(data) });
        v.it = track(v.anim, holder, { still, force, poster: v.anim.firstFrame || 0 });
        try { v.anim.goToAndStop(v.anim.firstFrame || 0, true); } catch (e) {}
      } catch (e) { if (tok === v._t) mdl.textContent = ''; }
    },
    // Ekrandan uzoqlashgan kartalar xotirani bo'shatadi (lottie + canvas), qaytganda qayta chiziladi.
    // Ko'p sovg'a bo'lganda ro'yxatni pastga aylantirganda ilova xotira yetmay yopilib qolmasligi uchun.
    sleep() {
      if (v._sl) return; v._sl = true; v._t++; cv._tok = (cv._tok || 0) + 1;
      if (v.anim) { untrack(v.it); try { v.anim.destroy(); } catch (e) {} v.anim = null; v.it = null; }
      mdl.replaceChildren(); cv._has = false; cv.width = 1; cv.height = 1;
    },
    wake() {
      if (!v._sl || v._dead) return; v._sl = false; cv.width = w; cv.height = h;
      const b = v._bd; if (b) { if (b[0] === 'p') v.plain(b[1], b[2]); else v.backdrop(b[1], b[2]); }
      const m = v._m; if (m) v.model(m[0], m[1], m[2], false, m[3], m[4]);
    },
    destroy() { v._t++; v._sl = true; v._dead = true; if (sleepIO) { try { sleepIO.unobserve(el); } catch (e) {} } if (v.anim) { untrack(v.it); try { v.anim.destroy(); } catch (e) {} v.anim = null; v.it = null; } },
  };
  el._v = v; if (sleepIO) sleepIO.observe(el);
  return v;
}

export function preload() {
  const run = async () => {
    for (let i = 0; i < CAT.backdrops.length; i++) { try { await loadImg(`bd/${pad2(i)}.jpg`); } catch (e) {} }
    for (let i = 0; i < CAT.patterns.length; i++) { try { await loadImg(`pt/${pad3(i)}.png`); } catch (e) {} }
    try { await loadModel('base', 0); await loadModel('base', 1); await loadModel('base', 2); await loadModel('base', 3); } catch (e) {}
    if (!ANIM.vip && (ANIM.lite || ANIM.server)) return;   // qurilma/server yuklangan: modellar faqat kerak bo'lganda yuklanadi
    for (let i = 0; i < CAT.cmodels.length; i++) { try { await loadModel(i, 1); } catch (e) {} }   // sotuvdagi kolleksiyalar; Pepe modellari kerak bo'lganda
  };
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 2000 }); else setTimeout(run, 300);
}

// ---- konfeti
export function confetti(ms = 2600) {
  if (!animOn()) return;   // animatsiya o'chiq bo'lsa konfeti ham yo'q
  const cv = document.getElementById('confetti'), x = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; x.scale(dpr, dpr);
  const cols = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#af52de', '#ff2d92'];
  const P = Array.from({ length: 140 }, () => ({
    x: innerWidth * (0.15 + Math.random() * 0.7), y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 11 - 3,
    s: 4 + Math.random() * 5, c: cols[(Math.random() * cols.length) | 0], r: Math.random() * 6,
  }));
  const t0 = performance.now();
  (function f(t) {
    const dt = t - t0; x.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of P) { p.vy += 0.28; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += 0.1;
      x.globalAlpha = Math.max(0, 1 - dt / ms); x.fillStyle = p.c; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }
    if (dt < ms) requestAnimationFrame(f); else x.clearRect(0, 0, innerWidth, innerHeight);
  })(t0);
}
