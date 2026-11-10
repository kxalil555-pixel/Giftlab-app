// Premium belgisi va emoji-statuslar (Lottie). Ro'yxatlarda yengil rasm (<img>), tanlash oynasida jonli animatsiya.
import { getLottie, track } from './art.js';

const pad2 = (n) => String(n).padStart(2, '0');

// ---------- statuslar katalogi: data/status.json  [{n: nomi, fr, op}]
let LIST = null;
export const statusList = () => LIST || (LIST = fetch('data/status.json').then((r) => r.json()).catch((e) => { LIST = null; throw e; }));

// i — 1-asosli indeks (server shunday saqlaydi: 0 = status yo'q)
const DATA = new Map();
export function statusData(i) {
  if (!DATA.has(i)) {
    DATA.set(i, (async () => {
      const r = await fetch(`st/${pad2(i - 1)}.bin`);
      if (!r.ok) throw new Error('status yo‘q');
      const s = new Blob([await r.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(s).text());
    })().catch((e) => { DATA.delete(i); throw e; }));
  }
  return DATA.get(i);
}

// Animatsiyaning "to'xtagan" kadri: yarim yo'l (belgi to'liq ko'rinadigan payt)
const posterFrame = (d) => Math.round(d.ip + (d.op - d.ip) * 0.5);

// Statik kadr bir marta SVG rasmga aylantiriladi va hamma joyda qayta ishlatiladi (ro'yxatlarda Lottie yurmaydi)
const POSTER = new Map();
export function statusPoster(i) {
  if (!POSTER.has(i)) {
    POSTER.set(i, Promise.all([getLottie(), statusData(i)]).then(([L, d]) => new Promise((res, rej) => {
      const tmp = document.createElement('div');
      tmp.style.cssText = 'position:fixed;left:-999px;top:0;width:128px;height:128px;visibility:hidden';
      document.body.appendChild(tmp);
      const an = L.loadAnimation({ container: tmp, renderer: 'svg', loop: false, autoplay: false, animationData: structuredClone(d) });
      an.addEventListener('DOMLoaded', () => {
        try {
          an.goToAndStop(posterFrame(d), true);
          res('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(tmp.querySelector('svg'))));
        } catch (err) { rej(err); }
        finally { setTimeout(() => { try { an.destroy(); } catch (_) {} tmp.remove(); }, 0); }
      });
    })).catch((e) => { POSTER.delete(i); throw e; }));
  }
  return POSTER.get(i);
}

// Statusning kichik (statik) ko'rinishi: <span class="stx"><img></span>
export function statusEl(i, px = 18) {
  const s = document.createElement('span'); s.className = 'stx'; s.style.setProperty('--s', px + 'px');
  statusPoster(i).then((src) => { const im = new Image(); im.src = src; im.alt = ''; im.draggable = false; s.appendChild(im); }).catch(() => {});
  return s;
}

// Statusning jonli ko'rinishi (tanlash oynasida): animatsiya boshqaruvi art.js orqali (foydalanuvchi yoqmagan bo'lsa — statik kadr)
export function statusLive(i, px = 44) {
  const s = document.createElement('span'); s.className = 'stx live'; s.style.setProperty('--s', px + 'px');
  Promise.all([getLottie(), statusData(i)]).then(([L, d]) => {
    const an = L.loadAnimation({ container: s, renderer: 'svg', loop: true, autoplay: false, animationData: structuredClone(d) });
    track(an, s, { poster: posterFrame(d) });
    try { an.goToAndStop(posterFrame(d), true); } catch (e) {}
  }).catch(() => {});
  return s;
}

// ---------- Premium belgisi (yulduzli nishon)
const BADGE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b93ff"/><stop offset=".55" stop-color="#a45bf2"/><stop offset="1" stop-color="#ff7ab6"/></linearGradient></defs><path fill="url(#g)" d="M12 1.8l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 16.6 6 19.9l1.3-6.6L2.4 8.7l6.7-.8z"/></svg>');
export function premBadge(px = 16) {
  const s = document.createElement('span'); s.className = 'stx prem'; s.style.setProperty('--s', px + 'px');
  const im = new Image(); im.src = BADGE; im.alt = ''; im.draggable = false; s.appendChild(im);
  return s;
}

// Ism yoniga: status bo'lsa — status, bo'lmasa Premium bo'lsa — belgi. p = { prem, st }
export function decorate(node, p, px = 16) {
  if (!node || !p) return node;
  if (p.st) node.appendChild(statusEl(p.st, px + 2));
  else if (p.prem) node.appendChild(premBadge(px));
  return node;
}
