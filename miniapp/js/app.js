import { catalog, visual, loadModel, preload, confetti, getLottie, mixHex, pad3, ANIM, animOn, track, setUserAnim, setServerLite, clearLocalLite, animEvents, schedule, setVip } from './art.js';
import { initChat } from './chat.js';
import { statusList, statusLive, decorate } from './perks.js';

const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  tg.ready(); tg.expand();
  try { tg.disableVerticalSwipes(); } catch (e) {}
}
const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
const pct = (p) => p + '%';
// ---- kolleksiyalar (0 = Plush Pepe, 1 = Durov’s Cap, 2 = B-Day Candle, 3 = Desk Calendar): narx, supply, nom va modellar har biri uchun alohida
const COLD = { name: '', supply: 0, sold: 0, issued: 0, price: 0, sell: 0, open: false };
const COL = (k) => ((ME && ME.cols && ME.cols[k || 0]) || COLD);
const MODELS = (k) => (k >= 4 ? (CAT.extra && CAT.extra[k] && CAT.extra[k].models) : k === 3 ? CAT.emodels : k === 2 ? CAT.dmodels : k === 1 ? CAT.cmodels : CAT.models) || [];
const BDL = (k) => (CAT.extra && CAT.extra[k] && CAT.extra[k].bd) || null;   // kolleksiya uchun cheklangan fonlar
const bdP = (k, i) => { const l = BDL(k); return l ? +(100 / l.length).toFixed(1) : CAT.backdrops[i].p; };
const bdRnd = (k, not) => { const l = BDL(k); return l ? l[rnd(l.length)] : rnd(CAT.backdrops.length, not); };
// Noyoblik darajasi yozuvi: craft modellarida o'z darajasi, oddiy modellarda foizga qarab 5 pog'ona
const TIERN = { legendary: 'Afsonaviy', epic: 'Epik', rare: 'Noyob', uncommon: 'Kamyob', common: 'Oddiy' };
const tierOf = (k, m) => { const x = MODELS(k)[m]; if (!x) return 'common'; if (x.t) return x.t; const p = x.p; return p <= 0.5 ? 'legendary' : p <= 1 ? 'epic' : p <= 1.5 ? 'rare' : p <= 2.5 ? 'uncommon' : 'common'; };
const isCrafted = (k, m) => { const cr = CAT.extra && CAT.extra[k] && CAT.extra[k].cr; return !!(cr && m >= cr.n); };
const rmod = (k) => { const cr = CAT.extra && CAT.extra[k] && CAT.extra[k].cr; return rnd(Math.min(cr ? cr.n : MODELS(k).length, 12)); };   // aylanish animatsiyasi: kichik, barqaror model to'plami (qotib qolmasligi uchun)
const mChip = (k, m) => { const x = MODELS(k)[m] || { p: 0 }; if (!isCrafted(k, m)) return `<span class="chip">${pct(x.p)}</span>`; const t = tierOf(k, m); return `<span class="tier t-${t}">${TIERN[t]}</span>`; };
const MDL = (g) => MODELS(g.k)[g.m] || { n: '', p: 0 };
const leftOf = (c) => Math.max(0, c.supply - c.sold);
const OPEN_K = () => { const c = ((ME && ME.cols) || []).find((x) => x.open); return c ? c.k : 0; };
const kfmt = (n) => (n >= 1000 ? String(Math.round(n / 100) / 10).replace(/\.0$/, '') + 'K' : String(n));
const rnd = (n, not) => { let r; do { r = (Math.random() * n) | 0; } while (r === not && n > 1); return r; };
const ICON = {
  x: '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>',
  diamond: '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M9 5h14l6 7-13 15L3 12z"/><path d="M3 12h26M12 5l-3 7 7 15 7-15-3-7M16 27L9 12"/></svg>',
  gavel: '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M17 5l6 6-9 9-6-6zM13 9l6 6M20 3l9 9-3 3-9-9zM12 22l-9 7M4 29h9"/></svg>',
  crown: '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M4 11l6 6 6-9 6 9 6-6-2 14H6z"/><path d="M6 25h20"/></svg>',
};
const TU = (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
const haptic = (k) => { try { tg.HapticFeedback.impactOccurred(k || 'light'); } catch (e) {} };


const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
ICON.pin = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M14.5 3l6.5 6.5-2 1-2.2-.3-3.1 3.1.6 4-1.5 1.5-3.6-3.6L5 20.5 3.5 19l4.3-4.4L4.2 11l1.5-1.5 4 .6 3.1-3.1L12.5 5z"/></svg>';
ICON.wear = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M3.5 8l4.6 3.6L12 5l3.9 6.6L20.5 8l-1.8 10H5.3zM5.8 20h12.4v1.5H5.8z"/></svg>';
ICON.tag = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M3 4.5A1.5 1.5 0 014.5 3h6.6c.4 0 .8.2 1.1.4l8.4 8.4a1.5 1.5 0 010 2.1l-6.6 6.6a1.5 1.5 0 01-2.1 0L3.4 12.1A1.5 1.5 0 013 11.1zM7.5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>';
ICON.trash = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4zM5.5 9h13l-1 11.5a1.5 1.5 0 01-1.5 1.5H8a1.5 1.5 0 01-1.5-1.5z"/></svg>';
ICON.gift = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 8h18v4H3zM4 13h7v8H5a1 1 0 01-1-1zM13 13h7v7a1 1 0 01-1 1h-6zM12 8c-2-4-6-4-6-1.5C6 8 8 8 12 8zm0 0c2-4 6-4 6-1.5C18 8 16 8 12 8z"/></svg>';
ICON.swap = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9h13l-4-4M4 9l4 4M28 23H15l4 4M28 23l-4-4"/><path d="M6 17l5-3 5 3-5 3zM16 11l5-3 5 3-5 3z" transform="translate(0 1)"/></svg>';
ICON.send = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M9 4h12l5 6-11 13L4 10z"/><path d="M4 10h22M11 4L8 10l7 13 7-13-3-6"/><circle cx="24.500" cy="23.500" r="5.500" fill="#0003"/><path d="M22 23.500h5M25 21l2.500 2.500L25 26"/></svg>';
ICON.craft = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M3 5h12.500a4.500 4.500 0 014.500 4.500V10h-4.200c-.5 1.700-1.800 3-3.800 3.300V15h2.500v2.500H8.500V15H11v-1.700C8.600 13 7 11.200 7 9H3zM17 11h4v1.500a2.500 2.500 0 01-2.500 2.500H17z"/><path d="M6 19h12v2H6z"/></svg>';
ICON.trashL = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 3h6l1 2h4v2H4V5h4zM5.500 9h13l-1 11.500a1.500 1.500 0 01-1.500 1.500H8a1.500 1.500 0 01-1.500-1.500z"/></svg>';
ICON.back = '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg>';
ICON.fprof = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><rect x="5" y="5" width="22" height="22" rx="7"/><circle cx="16" cy="13.500" r="4"/><path d="M9 25c1-4 3.500-6 7-6s6 2 7 6"/><path d="M2.500 9v-3a3.500 3.500 0 013.500-3.500h3M23 2.500h3a3.500 3.500 0 013.500 3.500v3"/></svg>';
ICON.badge = '<svg viewBox="0 0 32 32" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="M16 3l3.200 2.300 3.900-.1 1.300 3.700 3.200 2.300-1.200 3.700 1.200 3.700-3.200 2.300-1.300 3.700-3.900-.1L16 29l-3.200-2.300-3.900.1-1.300-3.700-3.200-2.300 1.200-3.700-1.200-3.700 3.200-2.300 1.300-3.700 3.900.1z"/><path d="M11 16.200l3.600 3.600 6.400-7"/></svg>';
ICON.lock = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 10V7.500a5 5 0 0110 0V10h.5A1.500 1.500 0 0119 11.500v8a1.500 1.500 0 01-1.500 1.500h-11A1.500 1.500 0 015 19.500v-8A1.500 1.500 0 016.500 10zm2 0h6V7.500a3 3 0 00-6 0z"/></svg>';
ICON.dots = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';

// ---------- Telegram sarlavhasi rangi + kiyilgan sovg'a foni (ekranning eng tepasigacha)
let PBG = null;
function setHdr(c) { if (tg) { try { tg.setHeaderColor(c || (SET.theme === 'dark' ? '#000000' : '#ffffff')); } catch (e) {} } }
function fullBleed(card, w) {
  const app = $('#app'), a = app.getBoundingClientRect(), c = card.getBoundingClientRect();
  const W = Math.round(a.width), H = Math.round(c.bottom - a.top);
  const lay = el('div', 'pbg'); lay.style.height = H + 'px';
  const v = visual(Math.round(W * 1.5), Math.round(H * 1.5)); viewLive.push(v); lay.appendChild(v.el);
  app.prepend(lay); PBG = lay;
  v.backdrop(w.b, w.p).then(() => {
    try { const d = v.cv.getContext('2d').getImageData(v.cv.width >> 1, 2, 1, 1).data; setHdr('#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('')); }
    catch (e) { setHdr(mixHex(CAT.backdrops[w.b].c, CAT.backdrops[w.b].e, 0.7)); }
  });
}
// ---------- Profil: karta, plitka, tablar
const san = (t) => String(t || '').replace(/[<>&]/g, '');
const PSLOT = [[-78, -30, 40], [-124, 2, 36], [-70, 26, 34], [56, -54, 40], [108, -28, 36], [80, 0, 34]];
function profCard(name, username, w, reg, photo, full, pins) {
  const nm = san(name) || 'Men';
  const card = el('div', 'pcard' + (w ? ' worn' : ''));
  if (w) { const v = visual(960, 600); reg.push(v); v.backdrop(w.b, w.p); card.appendChild(v.el); }
  const fl = el('div', 'pfl');
  (pins || []).slice(0, 6).forEach((g, i) => {
    const sl = PSLOT[i], it = el('i', 'pfi');
    it.style.cssText = `--x:${sl[0]}px;--y:${sl[1]}px;--z:${sl[2]}px;--c:${g.up ? CAT.backdrops[g.b].c : '#9cc8ff'}`;
    const v = visual(96); reg.push(v); v.model(g.up ? g.m : 'base', true, !SET.anim, false, g.k); it.appendChild(v.el); fl.appendChild(it);
  });
  card.appendChild(fl);
  const av = el('div', 'pav'); av.textContent = nm[0].toUpperCase();
  if (photo) { const im = new Image(); im.src = photo; im.alt = ''; im.onerror = () => im.remove(); av.appendChild(im); }
  const t = el('div', 'pname', `<span>${nm}</span>`);
  if (w) { const m = el('i', 'wm'); const v = visual(48); reg.push(v); v.model(w.m, true, false, false, w.k); m.appendChild(v.el); t.appendChild(m); }
  card.append(av, t);
  if (username) card.appendChild(el('div', 'puser', '@' + san(username)));
  return card;
}
// Sovg'alar ko'p bo'lsa hammasini bir vaqtda chizmaymiz (telefon xotirasi tugab, ilova qora bo'lib yopilardi):
// 12 tadan, pastga tushganda keyingilari qo'shiladi.
function lazyGrid(grid, items, mk, reg, step = 12) {
  let n = 0;
  const sent = el('div', 'lz'); sent.style.cssText = 'height:1px;grid-column:1/-1;width:100%';
  let io = null;
  const more = () => {
    items.slice(n, n + step).forEach((g, k) => grid.insertBefore(mk(g, n + k), sent));
    n += step;
    if (n >= items.length) { if (io) io.disconnect(); sent.remove(); return; }
    if (io) { io.unobserve(sent); io.observe(sent); }
  };
  grid.appendChild(sent);
  if (items.length <= step || typeof IntersectionObserver === 'undefined') { items.forEach((g, k) => grid.insertBefore(mk(g, k), sent)); sent.remove(); return; }
  io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) more(); }, { rootMargin: '500px 0px' });
  more();
  reg.push({ destroy() { if (io) io.disconnect(); } });
}
function tileEl(g, i, reg, fn, sz = 240) {
  const c = el('button', 'card tile'); const v = visual(sz); reg.push(v);
  const still = i > 5 || !SET.anim;
  if (g.up) { v.backdrop(g.b, g.p); v.model(g.m, true, still, false, g.k); } else { v.plain('#ffffff', '#ffffff'); c.classList.add('base'); v.model('base', true, still, false, g.k); }
  const col = COL(g.k), out = !col.open || leftOf(col) <= 0;
  const num = g.no || '…';
  c.appendChild(v.el); c.appendChild(el('div', g.up ? 'rib' : out ? 'rib out' : 'rib blue', g.up ? '#' + num : out ? 'Tugadi' : `1 of ${kfmt(col.supply)}`));
  if (g.h) c.classList.add('hid');
  if (g.n) c.appendChild(el('i', 'pinned', ICON.pin));
  if (g.s) c.appendChild(el('div', 'pbadge', `${star('#fff')}${fmt(g.s)}`));
  c.onclick = fn; return c;
}
async function reload() { try { ME = await call('me'); setServerLite(!!(ME && ME.lite)); setVip(!!(ME && ME.vip)); } catch (e) { try { toast(aerr(e)); } catch (_) {} } refresh(); }
function mineHead(view) {
  const w = ME.wear ? ME.gifts.find((g) => g.id === ME.wear && g.up) : null;
  const pc = profCard(TU.first_name || TU.username, TU.username, w, viewLive, TU.photo_url || ME.photo, false, ME.gifts.filter((g) => g.n && !g.h));
  decorate(pc.querySelector('.pname'), { prem: isPrem() ? 1 : 0, st: isPrem() ? ME.status : 0 }, 24);
  view.appendChild(pc);
  const tabs = el('div', 'ptabs', '<button data-t="gifts">Sovg‘alar</button><button data-t="set">Sozlamalar</button><button data-t="ref">Referallar</button>');
  tabs.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.t === MTAB);
    b.onclick = () => { if (b.dataset.t === 'ref') return toast('Tez orada'); MTAB = b.dataset.t; renderView(); };
  });
  const fb = el('button', 'pfilter', '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9.500"/><path d="M7.500 9.500h9M9.500 12.500h5M11 15.500h2"/></svg>');
  fb.onclick = () => pickSheet('Saralash', 'Sovg‘alar tartibini tanlang', [{ v: 'pin', t: 'Mahkamlanganlar avval' }, { v: 'num', t: 'Raqam bo‘yicha' }, { v: 'date', t: 'Sana bo‘yicha' }], MSORT, (v) => { MSORT = v; renderView(); });
  const prow = el('div', 'prow'); prow.append(tabs, fb); view.appendChild(prow);
  if (MTAB === 'set') { settingsPanel(view); return false; }
  return true;
}
const SET = { lang: LS.get('lang', 'uz'), theme: LS.get('theme', tg && tg.colorScheme === 'dark' ? 'dark' : 'light'), anim: LS.get('anim', false) };
SET._a = SET.anim; Object.defineProperty(SET, 'anim', { get() { try { return !!(this._a || (ME && ME.vip)); } catch (e) { return !!this._a; } }, set(v) { this._a = !!v; }, enumerable: true });   // VIP: animatsiya doim yoqilgan
setUserAnim(SET.anim);
animEvents(() => toast('Telefon sekinlashgani uchun animatsiyalar avtomatik o‘chirildi'));
function applyTheme() {
  const d = SET.theme === 'dark';
  document.documentElement.classList.toggle('dark', d); document.body.classList.toggle('dark', d);
  const c = d ? '#000000' : '#ffffff';
  const m = document.querySelector('meta[name=color-scheme]'); if (m) m.content = d ? 'dark' : 'light';
  if (tg) { try { tg.setHeaderColor(c); tg.setBackgroundColor(c); } catch (e) {} }
}
applyTheme();
const SI = (bg, path) => `<i class="si" style="background:${bg}"><svg viewBox="0 0 24 24" width="20" height="20" fill="#fff">${path}</svg></i>`;
const SICON = {
  plane: SI('linear-gradient(#37aee2,#1e96c8)', '<path d="M20.6 4.2L3.4 10.9c-.9.4-.9 1.1-.2 1.3l4.4 1.4 1.7 5.3c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.1-2 4.4 3.3c.8.5 1.4.2 1.6-.8l2.9-13.6c.3-1.2-.4-1.7-1.5-1.1zM9.3 13.3l8.6-5.4c.4-.3.8-.1.5.2l-7.1 6.4-.3 3.2z"/>'),
  verify: SI('linear-gradient(#3b9cff,#1a7ff0)', '<path d="M12 1.8l2.3 1.7 2.8-.1 1 2.7 2.3 1.6-.8 2.7.8 2.7-2.3 1.6-1 2.7-2.8-.1L12 20.2l-2.3-1.7-2.8.1-1-2.7-2.3-1.6.8-2.7-.8-2.7 2.3-1.6 1-2.7 2.8.1z"/><path fill="#2a8df5" d="M16.4 8.2l-7.5 3c-.4.2-.4.5 0 .6l1.9.6.7 2.2c.1.3.2.3.4.1l1-.9 2 1.5c.3.2.6.1.7-.3l1.2-5.7c.1-.5-.2-.7-.4-.7z"/>'),
  wallet: SI('linear-gradient(#1aa0ff,#0a7cf5)', '<path d="M5 6.5h12.5A2.5 2.5 0 0120 9v1h-4.5a3 3 0 000 6H20v1a2.5 2.5 0 01-2.5 2.5H5A2.5 2.5 0 012.5 17V9A2.5 2.5 0 015 6.5zM16 11.2h5v4.6h-5a2.3 2.3 0 010-4.6zm.2 1.4a.9.9 0 100 1.8.9.9 0 000-1.8z"/>'),
  stats: SI('linear-gradient(#27d364,#14b24b)', '<path d="M12 4a8 8 0 100 16 8 8 0 000-16zm0 3.2a2.7 2.7 0 110 5.4 2.7 2.7 0 010-5.4zm0 11.1c-2.2 0-4-.9-5.1-2.3.1-1.7 3.4-2.6 5.1-2.6s5 .9 5.1 2.6c-1.1 1.4-2.9 2.3-5.1 2.3z"/>'),
  rating: SI('linear-gradient(#ee4f6c,#d63352)', '<path d="M3.5 9h17v3.5h-17zM4.8 13.5h6.2V20H6.3a1.5 1.5 0 01-1.5-1.5zM13 13.5h6.2v5a1.5 1.5 0 01-1.5 1.5H13zM12 9C9.8 4.5 6 5.2 6.4 7.2 6.8 9 9.5 9 12 9zm0 0c2.2-4.5 6-3.8 5.6-1.8C17.2 9 14.5 9 12 9z"/>'),
  numbers: SI('linear-gradient(#ffb066,#f6963f)', '<path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2-5.6-3.2-5.6 3.2 1.3-6.2L3 9.3l6.3-.7z"/>'),
  username: SI('linear-gradient(#7de39a,#53cf78)', '<path d="M12 2.8l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2-5.6-3.2-5.6 3.2 1.3-6.2L3 9.3l6.3-.7z"/>'),
  support: SI('linear-gradient(#9a9aa0,#7c7c82)', '<path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 14.6a1.1 1.1 0 110-2.2 1.1 1.1 0 010 2.2zm1.1-4.1v.4h-2.1v-.8c0-1 .6-1.5 1.2-2 .5-.4.8-.6.8-1.1 0-.5-.4-.8-.9-.8-.6 0-1 .3-1.1.9l-2-.4c.3-1.5 1.5-2.5 3.1-2.5 1.7 0 3 1 3 2.6 0 1.1-.6 1.7-1.3 2.2-.5.4-.7.6-.7 1.5z"/>'),
  promo: SI('linear-gradient(#ff9f0a,#f57c00)', '<path d="M3 4.5A1.5 1.5 0 014.5 3h6.6c.4 0 .8.2 1.1.4l8.4 8.4a1.5 1.5 0 010 2.1l-6.6 6.6a1.5 1.5 0 01-2.1 0L3.4 12.1A1.5 1.5 0 013 11.1zM7.5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>'),
  lang: SI('linear-gradient(#3cb4f5,#1996e8)', '<path d="M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19zm6.9 8.5h-3.2a15 15 0 00-1.2-5.2A7.6 7.6 0 0118.9 11zM12 4.4c.8.9 1.6 3 1.8 6.6h-3.6c.2-3.600 1-5.700 1.800-6.600zM9.500 5.800A15 15 0 008.300 11H5.100a7.600 7.600 0 014.400-5.200zM5.100 13h3.200c.1 1.900.5 3.700 1.200 5.200A7.600 7.600 0 015.100 13zm5.100 0h3.600c-.2 3.600-1 5.700-1.800 6.600-.8-.9-1.600-3-1.800-6.600zm4.300 5.200c.7-1.500 1.100-3.300 1.200-5.200h3.200a7.600 7.600 0 01-4.400 5.200z"/>'),
  theme: SI('linear-gradient(#b445ea,#9a2fd6)', '<path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2v14a7 7 0 010-14z"/>'),
  anim: SI('linear-gradient(#f4623f,#e03a2c)', ICON.gift.replace(/<svg[^>]*>|<\/svg>/g, '')),
};
SICON.premium = SI('linear-gradient(#6b93ff,#a45bf2)', '<path d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4 6 20.6l1.3-6.6L2.4 9.4l6.7-.8z"/>');
SICON.status = SI('linear-gradient(#ffb340,#ff8a00)', '<path fill-rule="evenodd" d="M12 3a9 9 0 100 18 9 9 0 000-18zM9 9.2a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zm6 0a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM7.7 14h8.6a4.3 4.3 0 01-8.6 0z"/>');
const CHEV = '<svg class="chv" viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>';
const FLAG = {
  uz: '<svg viewBox="0 0 36 36" width="34" height="34"><defs><clipPath id="fu"><circle cx="18" cy="18" r="18"/></clipPath></defs><g clip-path="url(#fu)"><rect width="36" height="12" fill="#1eb4e5"/><rect y="12" width="36" height="12" fill="#fff"/><rect y="24" width="36" height="12" fill="#1eb53a"/><rect y="11.5" width="36" height="1" fill="#ce1126"/><rect y="23.500" width="36" height="1" fill="#ce1126"/></g></svg>',
  ru: '<svg viewBox="0 0 36 36" width="34" height="34"><defs><clipPath id="fr"><circle cx="18" cy="18" r="18"/></clipPath></defs><g clip-path="url(#fr)"><rect width="36" height="12" fill="#fff"/><rect y="12" width="36" height="12" fill="#0039a6"/><rect y="24" width="36" height="12" fill="#d52b1e"/></g></svg>',
  en: '<svg viewBox="0 0 36 36" width="34" height="34"><defs><clipPath id="fe"><circle cx="18" cy="18" r="18"/></clipPath></defs><g clip-path="url(#fe)"><rect width="36" height="36" fill="#fff"/><g fill="#d22f3f"><rect y="0" width="36" height="3"/><rect y="6" width="36" height="3"/><rect y="12" width="36" height="3"/><rect y="18" width="36" height="3"/><rect y="24" width="36" height="3"/><rect y="30" width="36" height="3"/></g><rect width="18" height="19" fill="#3c3b6e"/></g></svg>',
  zh: '<svg viewBox="0 0 36 36" width="34" height="34"><defs><clipPath id="fz"><circle cx="18" cy="18" r="18"/></clipPath></defs><g clip-path="url(#fz)"><rect width="36" height="36" fill="#de2910"/><path fill="#ffde00" d="M9 5l1.600 4.900h5.100l-4.100 3 1.600 4.900L9 14.800l-4.100 3 1.600-4.900-4.100-3h5.100z"/></g></svg>',
};
// Telegramdagidek pastdan chiqadigan tanlov oynasi (radio + OK)
function pickSheet(title, sub, opts, cur, save, warn) {
  clearSheet();
  const b = el('div', 'sb pk'); let sel = cur;
  b.innerHTML = `<h3>${title}</h3><p>${sub}${warn ? ` <em class="warn">${warn}</em>` : ''}</p>`;
  const list = el('div', 'pklist');
  opts.forEach((o) => {
    const r = el('button', 'pkrow' + (o.v === sel ? ' on' : ''), `${o.ic || ''}<span>${o.t}</span><i class="rad"></i>`);
    r.onclick = () => { sel = o.v; haptic('light'); list.querySelectorAll('.pkrow').forEach((x) => x.classList.remove('on')); r.classList.add('on'); };
    list.appendChild(r);
  });
  const ok = el('button', 'btn', 'OK'); ok.onclick = () => { closeSheet(); if (sel !== cur) save(sel); };
  b.append(list, ok); openSheet(b);
}
function statsSheet() {
  clearSheet();
  const gs = ME.gifts, val = (g) => COL(g.k).price + (g.up ? ME.upgradePrice : 0);
  const total = gs.reduce((a, g) => a + val(g), 0), top = gs.reduce((a, g) => Math.max(a, val(g)), 0);
  const b = el('div', 'sb pk');
  b.innerHTML = `<h3>Statistika</h3><p>Profilingiz umumiy statistikasi</p>
    <div class="stl"><div><b>${fmt(total)} ${star()}</b><span>Barcha sovg‘alar umumiy qiymati</span></div><div><b>${fmt(top)} ${star()}</b><span>Eng qimmat sovg‘a</span></div>
    <div><b>${gs.filter((g) => g.up).length}</b><span>Yaxshilangan sovg‘a</span></div><div><b>${gs.length}</b><span>Sotib olingan sovg‘a</span></div></div>`;
  const ok = el('button', 'btn', 'OK'); ok.onclick = closeSheet; b.appendChild(ok); openSheet(b);
}
function settingsPanel(view) {
  const soon = () => toast('Tez orada');
  const G = [
    [['premium', 'Premium', isPrem() ? `${dateStr(ME.prem)} gacha` : '', openPremium], ['status', 'Emoji status', ME.status ? 'Tanlangan' : '', openStatus]],
    [['plane', 'Ochiq profil', '', soon], ['verify', 'Tasdiqlashni sotib olish', '', soon]],
    [['wallet', 'Hamyon', 'Hamyonni ulash', soon], ['stats', 'Statistika', '', statsSheet], ['rating', 'Reyting', '', openBoard]],
    [['numbers', 'Raqamlarni sotib olish', 'Tez orada', null], ['username', 'Username sotib olish', 'Tez orada', null]],
    [['support', 'Yordam', '', soon], ['promo', 'Promokod', '', soon],
     ['lang', 'Til', '', () => pickSheet('Til', 'Sizga qulay tilni tanlang', [{ v: 'uz', t: 'O‘zbek', ic: FLAG.uz }, { v: 'ru', t: 'Russian', ic: FLAG.ru }, { v: 'en', t: 'English', ic: FLAG.en }, { v: 'zh', t: 'Chinese', ic: FLAG.zh }], SET.lang,
       (v) => { SET.lang = v; LS.set('lang', v); if (v !== 'uz') toast('Tarjima tez orada qo‘shiladi'); })],
     ['theme', 'Mavzu', '', () => pickSheet('Mavzu', 'Kerakli mavzuni tanlang', [{ v: 'light', t: 'Yorug‘', ic: '<i class="dotc"></i>' }, { v: 'dark', t: 'Qorong‘i', ic: '<i class="dotc k"></i>' }], SET.theme,
       (v) => { SET.theme = v; LS.set('theme', v); applyTheme(); renderView(); })],
     ['anim', 'Sovg‘a animatsiyalari', (ME && ME.vip) ? '⚡ Doimiy yoqilgan — to‘xtamaydi' : '', (ME && ME.vip) ? () => toast('⚡ Sizda doimiy animatsiya yoqilgan') : () => pickSheet('Sovg‘a animatsiyalari', 'Sovg‘a animatsiyalarini yoqishingiz mumkin.', [{ v: 'on', t: 'Yoqilgan' }, { v: 'off', t: 'O‘chirilgan' }], SET.anim ? 'on' : 'off',
       (v) => { SET.anim = v === 'on'; LS.set('anim', SET.anim); if (SET.anim) clearLocalLite(); setUserAnim(SET.anim); renderView(); if (SET.anim && ANIM.server) toast('Foydalanuvchilar ko‘p bo‘lgani uchun animatsiyalar vaqtincha o‘chiq'); }, 'Diqqat: bu funksiya ko‘p resurs talab qiladi. Telefon qotsa yoki foydalanuvchilar ko‘payib ketsa, animatsiyalar avtomatik o‘chadi.')]],
  ];
  G.forEach((rows) => {
    const g = el('div', 'sgrp');
    rows.forEach(([ic, t, sub, fn]) => {
      const r = el('button', 'srow' + (fn ? '' : ' off'), `${SICON[ic]}<span class="st"><b>${t}</b>${sub ? `<small>${sub}</small>` : ''}</span>${CHEV}`);
      if (fn) r.onclick = () => { haptic('light'); fn(); };
      g.appendChild(r);
    });
    view.appendChild(g);
  });
  if (!ME.admin) return;
  const box = el('div', 'setc', `<h3>Admin: Stars berish</h3><p>Foydalanuvchi ID raqami yoki @username (u ilovaga kirgan bo‘lishi kerak).</p>
    <input class="inp" id="g-to" placeholder="ID yoki @username" autocomplete="off"><input class="inp" id="g-n" type="number" inputmode="numeric" placeholder="Stars miqdori">`);
  const btn = el('button', 'btn', 'Stars yuborish');
  btn.onclick = async () => {
    const to = box.querySelector('#g-to').value, amount = box.querySelector('#g-n').value;
    btn.disabled = true;
    try { const r = await call('give', { to, amount }); haptic('medium'); toast(`${san(r.name)} ga ${fmt(r.amount)} Stars yuborildi`); box.querySelector('#g-n').value = ''; }
    catch (e) { toast(aerr(e)); }
    btn.disabled = false;
  };
  box.appendChild(btn); view.appendChild(box);

  // ---- Admin: tayyor sovg'a hadya qilish (kolleksiya, model, fon, naqsh, raqam, qabul qiluvchi ID)
  const SEL = 'width:100%;margin-top:8px;box-sizing:border-box';
  const opt = (arr, label) => `<option value="-1">${label}: tasodifiy</option>` + arr.map((x, i) => `<option value="${i}">${i + 1}. ${san(x.n)}</option>`).join('');
  const hbox = el('div', 'setc', `<h3>Admin: Sovg‘a hadya qilish</h3><p>Kolleksiya, model, fon, naqsh va raqamni tanlang. “Tasodifiy” yoki bo‘sh qoldirsangiz o‘zi tanlanadi. Sovg‘a qabul qiluvchi chatida ham ko‘rinadi.</p>
    <select class="inp" id="h-k" style="${SEL}">${ME.cols.map((c) => `<option value="${c.k}">${san(c.name)}</option>`).join('')}</select>
    <select class="inp" id="h-m" style="${SEL}"></select>
    <select class="inp" id="h-b" style="${SEL}">${opt(CAT.backdrops, 'Fon')}</select>
    <select class="inp" id="h-p" style="${SEL}">${opt(CAT.patterns, 'Naqsh')}</select>
    <input class="inp" id="h-n" type="number" inputmode="numeric" placeholder="Raqam (bo‘sh = eng kichik bo‘sh raqam)" style="${SEL}">
    <select class="inp" id="h-t" style="${SEL}"><option value="err">Raqam band bo‘lsa: xato bersin</option><option value="renum">Band bo‘lsa: eskisiga boshqa raqam berish</option><option value="del">Band bo‘lsa: eskisini o‘chirib olish</option></select>
    <input class="inp" id="h-c" type="number" inputmode="numeric" placeholder="Nechta (bo‘sh = 1 ta, ko‘pi bilan 100)" style="${SEL}">
    <input class="inp" id="h-to" placeholder="Qabul qiluvchi ID yoki @username" autocomplete="off" style="${SEL}">`);
  const fillM = () => { hbox.querySelector('#h-m').innerHTML = opt(MODELS(Number(hbox.querySelector('#h-k').value)), 'Model'); };
  hbox.querySelector('#h-k').onchange = fillM; fillM();
  const hbtn = el('button', 'btn', 'Sovg‘ani yuborish');
  hbtn.onclick = async () => {
    const q = (id) => hbox.querySelector(id).value;
    hbtn.disabled = true;
    try {
      const r = await call('grant', { to: q('#h-to'), kind: Number(q('#h-k')), model: Number(q('#h-m')), backdrop: Number(q('#h-b')), pattern: Number(q('#h-p')), num: q('#h-n'), taken: q('#h-t'), count: Math.floor(Number(q('#h-c')) || 1) });
      haptic('medium'); toast(r.made > 1 ? `${san(r.to)} ga ${r.made} ta sovg‘a yuborildi` + (r.short ? ` (zaxira yetmadi: ${r.short})` : '') : `${san(r.to)} ga #${r.num} yuborildi`); hbox.querySelector('#h-n').value = '';
    } catch (e) { toast(aerr(e)); }
    hbtn.disabled = false;
  };
  hbox.appendChild(hbtn); view.appendChild(hbox);

  // ---- Admin: OMMAVIY tarqatish (hamma foydalanuvchiga yoki o'zingizga) — sotib olish + yaxshilash + berish avtomatik
  const ask = (msg) => new Promise((res) => { try { if (tg && tg.showConfirm) return tg.showConfirm(msg, res); } catch (e) {} res(window.confirm(msg)); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const openCols = ME.cols.filter((c) => c.open);

  const bbox = el('div', 'setc', `<h3>Admin: Ommaviy sovg‘a tarqatish</h3><p>Sovg‘alar avtomatik sotib olinadi, yaxshilanadi (tasodifiy model/fon/naqsh/raqam), egasiga beriladi, chatda karta ko‘rinadi va botdan xabar boradi. Har bir sovg‘a tanlangan kolleksiyalardan aralash chiqadi.</p>
    <select class="inp" id="b-w" style="${SEL}"><option value="all">Barcha foydalanuvchilarga</option><option value="me">Faqat o‘zimga (yaxshilangan holda)</option></select>
    <select class="inp" id="b-m" style="${SEL}"><option value="equal">Teng bo‘lib berish (jami son)</option><option value="lucky">Tasodifiy foydalanuvchilarga (1 tadan)</option><option value="each">Har biriga shuncha tadan</option></select>
    <input class="inp" id="b-n" type="number" inputmode="numeric" placeholder="Sovg‘alar soni" style="${SEL}">
    <div id="b-k" style="margin-top:8px">${openCols.map((c) => `<label style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="checkbox" value="${c.k}" checked> ${san(c.name)}</label>`).join('')}</div>
    <div id="b-s" style="margin-top:8px;font-size:13px;opacity:.8"></div>`);
  const bst = bbox.querySelector('#b-s');
  const bbtn = el('button', 'btn', 'Tarqatishni boshlash');
  bbtn.onclick = async () => {
    const q = (id) => bbox.querySelector(id).value;
    const who = q('#b-w'), mode = q('#b-m'), n = Math.floor(Number(q('#b-n')) || 0);
    const kinds = [...bbox.querySelectorAll('#b-k input:checked')].map((x) => Number(x.value));
    if (n < 1) return toast('Sovg‘alar sonini kiriting');
    if (!kinds.length) return toast('Kamida bitta kolleksiyani tanlang');
    bbtn.disabled = true;
    try {
      let items = [], names = 0;
      if (who === 'me') {
        for (let left = n; left > 0; left -= 60) items.push({ n: Math.min(60, left) });
      } else {
        const info = await call('bulk', { op: 'users' });
        const ids = shuffle(info.ids || []);
        if (!ids.length) throw { message: 'Foydalanuvchilar yo‘q' };
        names = ids.length;
        const cnt = ids.map(() => 0);
        if (mode === 'each') cnt.fill(n);
        else if (mode === 'lucky') for (let i = 0; i < n; i++) cnt[i % ids.length]++;
        else { const base = Math.floor(n / ids.length), rem = n % ids.length; ids.forEach((_, i) => { cnt[i] = base + (i < rem ? 1 : 0); }); }
        ids.forEach((id, i) => { for (let left = cnt[i]; left > 0; left -= 60) items.push({ to: id, n: Math.min(60, left) }); });
        const room = kinds.reduce((s, k) => s + ((info.left && info.left[k]) || 0), 0);
        if (!items.length) throw { message: 'Foydalanuvchilar soni sovg‘alar sonidan ko‘p — “Tasodifiy (1 tadan)” ni tanlang' };
        const sum = items.reduce((s, x) => s + x.n, 0);
        if (sum > room) throw { message: `Tanlangan kolleksiyalarda faqat ${fmt(room)} ta joy qolgan` };
      }
      const sum = items.reduce((s, x) => s + x.n, 0);
      const ok = await ask(who === 'me' ? `${fmt(sum)} ta sovg‘a sotib olinib, yaxshilanib, o‘zingizga qo‘shiladi. Davom etamizmi?` : `${fmt(sum)} ta sovg‘a ${fmt(items.length)} ta qabul qiluvchiga yuboriladi (${fmt(names)} ta foydalanuvchi ichidan). Bekor qilib bo‘lmaydi. Davom etamizmi?`);
      if (!ok) { bbtn.disabled = false; return; }

      // bo'laklab yuboramiz (bir so'rovda ≤60 sovg'a / ≤30 qabul qiluvchi)
      const chunks = []; let cur = [], cs = 0;
      items.forEach((it) => { if (cur.length >= 30 || cs + it.n > 60) { chunks.push(cur); cur = []; cs = 0; } cur.push(it); cs += it.n; });
      if (cur.length) chunks.push(cur);
      const T = { made: 0, users: 0, failed: 0, short: 0, notified: 0, byKind: {} };
      for (let i = 0; i < chunks.length; i++) {
        bst.textContent = `⏳ ${i + 1}/${chunks.length} …  yaratildi: ${fmt(T.made)}`;
        const r = await call('bulk', { op: 'run', kinds, items: chunks[i], self: who === 'me' ? 1 : 0 });
        T.made += r.made; T.users += r.users; T.failed += r.failed; T.short += r.short; T.notified += r.notified;
        Object.entries(r.byKind || {}).forEach(([k, v]) => { T.byKind[k] = (T.byKind[k] || 0) + v; });
        if (i + 1 < chunks.length) await sleep(700);
      }
      haptic('medium');
      bst.innerHTML = `✅ Tayyor: ${fmt(T.made)} ta sovg‘a${who === 'me' ? '' : `, ${fmt(T.users)} ta foydalanuvchiga, botdan xabar: ${fmt(T.notified)}`}` + (T.failed ? `<br>⚠️ Xatolik: ${fmt(T.failed)}` : '') + (T.short ? `<br>⚠️ Joy yetmadi (supply): ${fmt(T.short)}` : '') + '<br>' + Object.entries(T.byKind).map(([k, v]) => `${san(k)}: ${fmt(v)}`).join(' · ');
      toast('Tarqatish tugadi');
    } catch (e) { bst.textContent = '❌ ' + aerr(e); toast(aerr(e)); }
    bbtn.disabled = false;
  };
  bbox.appendChild(bbtn); view.appendChild(bbox);

  // ---- Admin: marketdagi HAMMA sovg'ani sotib olish (o'zimga yoki hammaga tarqatib)
  const mbox = el('div', 'setc', `<h3>Admin: Marketni to‘liq sotib olish</h3><p>Marketda sotuvga qo‘yilgan barcha sovg‘alar sotib olinadi (sotuvchilarga pul odatdagidek to‘lanadi va xabar boradi). Keyin hammasi o‘zingizda qoladi yoki foydalanuvchilarga tarqatiladi.</p>
    <select class="inp" id="m-w" style="${SEL}"><option value="me">Hammasi o‘zimga</option><option value="all">Foydalanuvchilarga teng tarqatish (tasodifiy)</option></select>
    <div id="m-s" style="margin-top:8px;font-size:13px;opacity:.8"></div>`);
  const mst = mbox.querySelector('#m-s');
  const mbtn = el('button', 'btn', 'Marketni sotib olish');
  mbtn.onclick = async () => {
    const who = mbox.querySelector('#m-w').value;
    mbtn.disabled = true;
    try {
      const L = await call('marketAll', { op: 'list' });
      if (!L.items.length) throw { message: 'Marketda sovg‘a yo‘q' };
      let ids = [];
      if (who === 'all') { const info = await call('bulk', { op: 'users' }); ids = shuffle(info.ids || []); if (!ids.length) throw { message: 'Foydalanuvchilar yo‘q' }; }
      const plan = shuffle(L.items).map((x, i) => (who === 'all' ? { id: x.id, to: ids[i % ids.length] } : { id: x.id }));
      const ok = await ask(`Marketdagi ${fmt(plan.length)} ta sovg‘a (jami ${fmt(L.total)} ⭐) sotib olinadi va ${who === 'all' ? `${fmt(Math.min(ids.length, plan.length))} ta foydalanuvchiga tarqatiladi` : 'sizga qo‘shiladi'}. Bekor qilib bo‘lmaydi. Davom etamizmi?`);
      if (!ok) { mbtn.disabled = false; return; }
      let bought = 0, gone = 0, spent = 0;
      for (let i = 0; i < plan.length; i += 30) {
        mst.textContent = `⏳ ${fmt(Math.min(i + 30, plan.length))}/${fmt(plan.length)} …`;
        const r = await call('marketAll', { op: 'buy', items: plan.slice(i, i + 30) });
        bought += r.bought; gone += r.gone; spent += r.spent;
        if (i + 30 < plan.length) await sleep(700);
      }
      haptic('medium');
      mst.textContent = `✅ ${fmt(bought)} ta sovg‘a sotib olindi (${fmt(spent)} ⭐)${who === 'all' ? ' va tarqatildi' : ''}` + (gone ? `, allaqachon sotilgan: ${fmt(gone)}` : '');
      toast('Market sotib olindi');
    } catch (e) { mst.textContent = '❌ ' + aerr(e); toast(aerr(e)); }
    mbtn.disabled = false;
  };
  mbox.appendChild(mbtn); view.appendChild(mbox);

  // ---- Admin: doimiy animatsiya (VIP) — ID bo'yicha berish / olib qo'yish
  const vbox = el('div', 'setc', `<h3>Admin: Doimiy animatsiya ⚡</h3><p>Bu funksiya berilgan foydalanuvchida sovg‘a animatsiyalari hech qachon o‘chmaydi: telefon qizib ketsa ham, foydalanuvchilar ko‘payib ketsa ham. Ilovada sozlamalarda “⚡ Doimiy yoqilgan” bo‘lib ko‘rinadi.</p>
    <input class="inp" id="v-to" placeholder="Foydalanuvchi ID yoki @username" autocomplete="off" style="${SEL}">
    <div id="v-l" style="margin-top:8px;font-size:13px;opacity:.85"></div>`);
  const vl = vbox.querySelector('#v-l');
  const vload = async () => {
    try {
      const r = await call('vip', { op: 'list' });
      vl.innerHTML = r.items.length ? 'Berilganlar:<br>' + r.items.map((x) => `⚡ ${san(x.name) || x.id} ${x.username ? '@' + san(x.username) : ''} <span style="opacity:.6">(${x.id})</span>`).join('<br>') : 'Hozircha hech kimga berilmagan';
    } catch (e) { vl.textContent = ''; }
  };
  const vact = (op, label) => {
    const b = el('button', 'btn', label); b.style.marginTop = '8px';
    b.onclick = async () => {
      const to = vbox.querySelector('#v-to').value;
      b.disabled = true;
      try { const r = await call('vip', { op, to }); haptic('medium'); toast(r.on ? `${san(r.name)} ga doimiy animatsiya berildi` : `${san(r.name)} dan olib qo‘yildi`); vbox.querySelector('#v-to').value = ''; await vload(); }
      catch (e) { toast(aerr(e)); }
      b.disabled = false;
    };
    vbox.appendChild(b);
  };
  vact('add', 'Berish ⚡'); vact('remove', 'Olib qo‘yish'); view.appendChild(vbox); vload();

  // ---- Admin: ommaviy yaxshilash (upgrade) — tanlangan foydalanuvchilarning (yoki hammaning) hamma oddiy sovg'alari
  const ubox = el('div', 'setc', `<h3>Admin: Ommaviy yaxshilash (upgrade) ⬆️</h3><p>Foydalanuvchilarning yaxshilanmagan sovg‘alari bittada yaxshilanadi (tasodifiy model/fon/naqsh/raqam, Stars olinmaydi). ID larni vergul yoki probel bilan yozing. Bo‘sh qoldirsangiz — HAMMA foydalanuvchi.</p>
    <input class="inp" id="u-ids" placeholder="ID lar (masalan 123, 456 yoki @nom). Bo‘sh = hamma" autocomplete="off" style="${SEL}">
    <div id="u-s" style="margin-top:8px;font-size:13px;opacity:.8"></div>`);
  const ust = ubox.querySelector('#u-s');
  const ubtn = el('button', 'btn', 'Hammasini yaxshilash');
  ubtn.onclick = async () => {
    const raw = ubox.querySelector('#u-ids').value.split(/[\s,;]+/).filter(Boolean);
    ubtn.disabled = true;
    try {
      const ids = [];
      for (const t of raw) {
        if (/^\d+$/.test(t)) ids.push(Number(t));
        else { const r = await call('vip', { op: 'resolve', to: t }); ids.push(r.id); }
      }
      const c = await call('bulkUp', { op: 'count', ids });
      if (!c.total) throw { message: 'Yaxshilanmagan sovg‘a yo‘q' };
      const ok = await ask(`${fmt(c.users)} ta foydalanuvchining ${fmt(c.total)} ta oddiy sovg‘asi yaxshilanadi (bepul). Bekor qilib bo‘lmaydi. Davom etamizmi?`);
      if (!ok) { ubtn.disabled = false; return; }
      let done = 0, failed = 0; const per = {}; let guard = 0;
      for (;;) {
        ust.textContent = `⏳ ${fmt(done)}/${fmt(c.total)} …`;
        const r = await call('bulkUp', { op: 'run', ids });
        done += r.done; failed += r.failed;
        (r.per || []).forEach(([k, v]) => { per[k] = (per[k] || 0) + v; });
        if (r.left <= 0 || !r.done || ++guard > 500) break;
        await sleep(300);
      }
      const list = Object.entries(per).map(([id, n]) => ({ id: Number(id), n }));
      let sent = 0;
      for (let i = 0; i < list.length; i += 25) {
        ust.textContent = `✉️ Xabar yuborilmoqda: ${fmt(Math.min(i + 25, list.length))}/${fmt(list.length)}`;
        try { sent += (await call('bulkUp', { op: 'notify', items: list.slice(i, i + 25) })).sent; } catch (e) {}
        if (i + 25 < list.length) await sleep(1000);
      }
      haptic('medium');
      ust.textContent = `✅ ${fmt(done)} ta sovg‘a yaxshilandi (${fmt(list.length)} ta foydalanuvchi), botdan xabar: ${fmt(sent)}` + (failed ? `, xatolik: ${fmt(failed)}` : '');
      toast('Yaxshilash tugadi');
    } catch (e) { ust.textContent = '❌ ' + aerr(e); toast(aerr(e)); }
    ubtn.disabled = false;
  };
  ubox.appendChild(ubtn); view.appendChild(ubox);

  // ---- Admin: diagnostika — har bir yangi funksiya serverda ishlayaptimi, tekshiradi va xatoning xom matnini ko'rsatadi
  const dbox = el('div', 'setc', `<h3>Admin: Diagnostika 🔧</h3><p>Server funksiyalarini birma-bir tekshiradi. Xato chiqsa, shu matnni yuboring.</p><div id="d-s" style="margin-top:8px;font-size:13px;line-height:1.5;word-break:break-all"></div>`);
  const dst = dbox.querySelector('#d-s');
  const dbtn = el('button', 'btn', 'Tekshirish');
  dbtn.onclick = async () => {
    dbtn.disabled = true; dst.innerHTML = '';
    const tests = [['bulk (ping)', 'bulk', { op: 'ping' }], ['bulk (users)', 'bulk', { op: 'users' }], ['bulkUp (count)', 'bulkUp', { op: 'count', ids: [] }], ['marketAll (list)', 'marketAll', { op: 'list' }], ['vip (list, anim_vip jadvali)', 'vip', { op: 'list' }], ['me', 'me', {}]];
    for (const [label, name, inp] of tests) {
      const t0 = Date.now(); let line;
      try { const r = await call(name, inp); line = `✅ ${label} — ${Date.now() - t0} ms`; if (name === 'bulk' && r.ids) line += ` (foydalanuvchilar: ${r.ids.length})`; if (name === 'bulkUp') line += ` (yaxshilanmagan: ${r.total})`; if (name === 'marketAll') line += ` (marketda: ${r.items.length})`; }
      catch (e) { line = `❌ ${label} — ${Date.now() - t0} ms — ${san(aerr(e))}`; }
      dst.innerHTML += line + '<br>';
    }
    dbtn.disabled = false;
  };
  dbox.appendChild(dbtn); view.appendChild(dbox);

  // ---- Admin: Stars'ni hamma foydalanuvchiga teng bo'lib berish
  const sbox = el('div', 'setc', `<h3>Admin: Stars tarqatish</h3><p>Kiritilgan jami summa barcha foydalanuvchilarga (admindan tashqari) teng bo‘linadi. Qoldiq (bo‘linmay qolgan) berilmaydi. Botdan xabar boradi.</p>
    <input class="inp" id="s-n" type="number" inputmode="numeric" placeholder="Jami Stars (masalan 10000000000)" style="${SEL}">
    <div id="s-s" style="margin-top:8px;font-size:13px;opacity:.8"></div>`);
  const sst = sbox.querySelector('#s-s');
  const sbtn = el('button', 'btn', 'Teng bo‘lib yuborish');
  sbtn.onclick = async () => {
    const total = Math.floor(Number(sbox.querySelector('#s-n').value) || 0);
    if (total < 1) return toast('Summani kiriting');
    sbtn.disabled = true;
    try {
      const info = await call('bulk', { op: 'users' });
      const ids = info.ids || [];
      if (!ids.length) throw { message: 'Foydalanuvchilar yo‘q' };
      const per = Math.floor(total / ids.length);
      if (per < 1) throw { message: `Summa kam: ${fmt(ids.length)} ta foydalanuvchiga 1 ⭐ dan ham kam tushadi` };
      if (per > 1e12) throw { message: 'Summa juda katta' };
      const rest = total - per * ids.length;
      const ok = await ask(`${fmt(ids.length)} ta foydalanuvchining har biriga ${fmt(per)} ⭐ beriladi (jami ${fmt(per * ids.length)}${rest ? `, qoldiq ${fmt(rest)} berilmaydi` : ''}). Davom etamizmi?`);
      if (!ok) { sbtn.disabled = false; return; }
      let done = 0, notified = 0, missing = 0;
      for (let i = 0; i < ids.length; i += 40) {
        sst.textContent = `⏳ ${fmt(Math.min(i + 40, ids.length))}/${fmt(ids.length)} …`;
        const r = await call('bulkStars', { ids: ids.slice(i, i + 40), amount: per });
        done += r.ok; notified += r.notified; missing += r.missing;
        if (i + 40 < ids.length) await sleep(700);
      }
      haptic('medium');
      sst.textContent = `✅ ${fmt(done)} ta foydalanuvchiga ${fmt(per)} ⭐ dan berildi, botdan xabar: ${fmt(notified)}` + (missing ? `, topilmadi: ${fmt(missing)}` : '');
      toast('Stars tarqatildi');
    } catch (e) { sst.textContent = '❌ ' + aerr(e); toast(aerr(e)); }
    sbtn.disabled = false;
  };
  sbox.appendChild(sbtn); view.appendChild(sbox);
}

let ME = null, CAT = null, TAB = 'shop', CHAT = null, MTAB = 'gifts', MSORT = 'pin';
let viewLive = [], sheetLive = [], sheetTimers = [];

// ---------- server bilan aloqa
function call(name, input = {}) {
  return new Promise((res, rej) => {
    const S = tg && tg.Serverless;
    if (!S) return rej({ message: 'Telegram ichida oching' });
    S.call(name, input, (err, r) => (err ? rej(err) : res(r)));
  });
}
const ERR = {
  NO_STARS: 'Yetarli Stars yo‘q', SOLD_OUT: 'Hammasi sotilgan', DONE: 'Allaqachon yaxshilangan',
  NOT_SUB: 'Avval kanalga obuna bo‘ling', NOT_FOUND: 'Sovg‘a topilmadi', RATE: 'Sekinroq yozing', DUP: 'Xuddi shu xabar', LINKS: 'Havola yuborish mumkin emas', LONG: 'Xabar juda uzun', BANNED: 'Siz bloklangansiz', EMPTY: 'Bo‘sh xabar', FORBIDDEN: 'Ruxsat yo‘q', NUM_TAKEN: 'Bu raqam band', BAD: 'Noto‘g‘ri qiymat', UPGRADED: 'Yaxshilangan sovg‘ani almashtirib bo‘lmaydi', RETRY: 'Qayta urinib ko‘ring', NO_USER: 'Foydalanuvchi topilmadi', SELF: 'O‘zingizga yubora olmaysiz',
};
Object.assign(ERR, { NEED_PREMIUM: 'Emoji-status faqat Premium uchun', LIMIT: 'Hikoyalar soni to‘ldi (24 soatdan keyin yangilanadi)' });
const errText = (e) => ERR[e && e.parameters && e.parameters.code] || (e && e.message) || 'Xatolik';
// Admin uchun xatoning xom ko'rinishi ham chiqadi (sababini topish oson bo'lsin); oddiy foydalanuvchi faqat odatiy matnni ko'radi
const aerr = (e) => { let raw = ''; try { if (ME && ME.admin) raw = JSON.stringify(e, Object.getOwnPropertyNames(Object(e))); } catch (x) {} return errText(e) + (raw && raw !== '{}' ? ' | ' + raw.slice(0, 220) : ''); };

let toastT = 0;
function toast(t) {
  const e = $('#toast'); e.textContent = t; e.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2600);
}

// ---------- sheet
function later(fn, ms) { const id = setTimeout(fn, ms); sheetTimers.push(id); return id; }
function every(fn, ms) { const id = setInterval(fn, ms); sheetTimers.push(id); return id; }
function clearSheet() {
  sheetTimers.forEach((id) => { clearTimeout(id); clearInterval(id); }); sheetTimers = [];
  sheetLive.forEach((v) => v.destroy()); sheetLive = [];
}
function openSheet(node) {
  $('#sheet-body').replaceChildren(node);
  document.body.classList.add('sh'); $('#sheet').scrollTop = 0;
}
function closeSheet() { document.body.classList.remove('sh'); clearSheet(); }
$('#dim').onclick = closeSheet;

function hero(o) {
  const h = el('div', 'hero' + (o.cls ? ' ' + o.cls : ''));
  const hw = Math.min(window.innerWidth || 390, 520), hh = o.h || 300;
  const v = visual(Math.round(hw * 1.5), Math.round(hh * 1.5)); sheetLive.push(v); h.appendChild(v.el);
  h.style.height = hh + 'px';
  if (o.bd) v.backdrop(o.bd[0], o.bd[1]); else v.plain(o.c1 || '#e6f5d9', o.c2 || '#8fcf86');
  if (o.model != null) v.model(o.model, o.loop !== false, false, false, o.kind);
  if (o.title) h.appendChild(el('div', 'hero-t', `<h2>${o.title}</h2><div>${o.sub || ''}</div>`));
  const x = el('button', 'sx glass-d', ICON.x); x.onclick = closeSheet; h.appendChild(x);
  h.v = v; return h;
}
const star = (c) => `<svg class="star" viewBox="0 0 24 24"${c ? ` style="color:${c}"` : ''}><path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.7 6.2 20.1l1.4-6.4L2.7 9.3l6.5-.7z"/></svg>`;
const row = (k, v) => `<div><b>${k}</b><span>${v}</span></div>`;

// ---------- bosh ko'rinish
function head() {
  $('#bal').textContent = ME.balance === null ? '∞' : fmt(ME.balance);
  { const n = Math.max(ME.total || 0, ME.gifts.length); $('#me-badge').textContent = n ? n : ''; }
}
function renderView() {
  viewLive.forEach((v) => v.destroy()); viewLive = []; mkCleanup();
  if (PBG) { PBG.remove(); PBG = null; } setHdr();
  const view = $('#view'); view.replaceChildren();
  view.className = 'v-' + TAB;
  document.body.classList.toggle('t-chat', TAB === 'chat');
  document.querySelectorAll('#nav [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === TAB));
  $('#me-btn').classList.toggle('on', TAB === 'mine');
  syncLens();
  if (TAB === 'chat') { CHAT && CHAT.renderHome(view); return; }
  if (TAB === 'market') { renderMarket(view); return; }
  if (TAB === 'shop') {
    const gone = (c) => (!c.open || leftOf(c) <= 0 ? 1 : 0);   // tugagan: yopilgan yoki qolmagan
    const cols = [...(ME.cols || [])].sort((x, y) => gone(x) - gone(y) || y.price - x.price || y.k - x.k);   // sotuvdagisi tepada (ichida qimmati birinchi), "Tugadi" avtomatik pastga tushadi
    // ---- tepadagi "Sovg'a sotib oling" kartasi (Faith Amulet — Gold Night)
    const sh = el('div', 'shop-hero');
    sh.innerHTML = `<div class="sh-card"><div class="sh-gift"></div><h2>Sovg‘a sotib oling</h2>
      <p>Sotuvdagi sovg‘alarni sotib olib, ularni yaxshilashingiz yoki o‘zingizda saqlashingiz mumkin.</p></div>`;
    const hv = visual(300); viewLive.push(hv); hv.plain('#ffffff', '#ffffff');
    hv.model(0, true, false, false, 8, true);                       // Faith Amulet — «Gold Night»
    sh.querySelector('.sh-gift').appendChild(hv.el);
    view.appendChild(sh);
    cols.forEach((col) => {
      const c = el('button', 'card');
      const soldOut = !col.open || leftOf(col) <= 0;
      c.appendChild(el('div', soldOut ? 'ribbon out' : 'ribbon', soldOut ? 'Tugadi' : 'Limited'));
      const v = visual(240); viewLive.push(v); v.plain(); v.model('base', true, false, false, col.k); c.appendChild(v.el);
      c.appendChild(el('div', 'price', `${star()}${fmt(col.price)}`));
      if (!soldOut) c.appendChild(el('div', 'tag', `${fmt(leftOf(col))} qoldi`));
      else c.classList.add('sold');
      c.onclick = () => (soldOut ? openSoldOut(col) : openBuy(col.k)); view.appendChild(c);
    });
    for (let i = 0; i < Math.max(0, 3 - cols.length); i++) {
      const s = el('div', 'card soon');
      s.appendChild(el('div', 'vis', '<div style="position:absolute;inset:0;display:grid;place-items:center;font-size:34px;color:#c7c7cc">?</div>'));
      s.appendChild(el('div', 'tag', 'Tez orada')); s.appendChild(el('div', 'price', '&nbsp;'));
      view.appendChild(s);
    }
  } else if (!ME.gifts.length) {
    if (!mineHead(view)) return;
    view.appendChild(el('div', 'empty', 'Hali sovg‘a yo‘q.<br>Do‘kondan sotib oling!'));
  } else {
    if (!mineHead(view)) return;
    const list = [...ME.gifts].sort({ pin: (x, y) => (y.n || 0) - (x.n || 0), num: (x, y) => x.id - y.id, date: (x, y) => new Date(y.d) - new Date(x.d) }[MSORT]);
    lazyGrid(view, list, (g, i) => tileEl(g, i, viewLive, () => (g.up ? showUnique(g) : showSaved(g))), viewLive);
  }
}
function refresh() { head(); renderView(); }


// ---------- Bozor: Telegramdagidek filtrlar (Narx / Model / Fon / Naqsh)
const MK = { items: null, sort: 'price', sel: { m: null, b: null, p: null }, live: [], pop: [], shown: 60 };
const SORTS = [['price', 'Narx bo‘yicha', 'Narx', '<path d="M12 3v18M16 7.5c-.7-1.2-2.3-1.9-4-1.9-2.2 0-3.800 1-3.800 2.600 0 3.600 8 1.800 8 5.600 0 1.600-1.700 2.700-4.200 2.700-1.900 0-3.500-.8-4.200-2.200"/>'],
  ['date', 'Sana bo‘yicha', 'Sana', '<rect x="3.500" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.500 10h17"/>'],
  ['num', 'Raqam bo‘yicha', 'Raqam', '<path d="M9 4L7 20M17 4l-2 16M4 9h16M3.500 15h16"/>']];
const FLT = [['m', 'Model', 'models'], ['b', 'Fon', 'backdrops'], ['p', 'Naqsh', 'patterns']];
const fk = (g, k) => (k === 'm' ? (g.k || 0) * 100 + g.m : g[k]);   // model kaliti: kolleksiya*100 + model
const MKI = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const UPDN = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 9.500l4-4 4 4M8 14.500l4 4 4-4"/></svg>';
const CHECK = '<svg class="ck" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M5 12.500l4.500 4.500L19 7.500"/></svg>';
function mkCleanup() {
  mkClosePop(); MK.live.forEach((v) => v.destroy()); MK.live = [];
}
function mkClosePop() {
  document.querySelectorAll('.mk-pop,.mk-ov').forEach((n) => n.remove());
  document.querySelectorAll('.mk-chip.open').forEach((c) => c.classList.remove('open'));
  MK.pop.forEach((v) => v.destroy()); MK.pop = [];
}
function mkVisible() {
  const a = MK.items.filter((g) => FLT.every(([k]) => !MK.sel[k] || MK.sel[k].has(fk(g, k))));
  const by = {
    price: (x, y) => x.s - y.s || x.id - y.id,
    date: (x, y) => (new Date(y.d) - new Date(x.d)) || y.id - x.id,
    num: (x, y) => x.id - y.id,
  }[MK.sort];
  return a.sort(by);
}
function mkGrid(view) {
  MK.live.forEach((v) => v.destroy()); MK.live = [];
  const box = view.querySelector('.mk-grid'), more = view.querySelector('.mk-more-w');
  box.replaceChildren(); more.replaceChildren();
  const list = mkVisible();
  if (!list.length) { box.appendChild(el('div', 'empty', MK.items.length ? 'Filtr bo‘yicha hech narsa topilmadi.' : 'Hozircha sotuvda sovg‘a yo‘q.<br>O‘z sovg‘angizni sotuvga qo‘ying!')); return; }
  list.slice(0, MK.shown).forEach((g, i) => box.appendChild(tileEl(g, i, MK.live, () => {
    const mine = g.o === TU.id && ME.gifts.find((x) => x.id === g.id);
    showUnique(mine || g, mine ? undefined : { owner: { id: g.o, name: g.on } });
  })));
  if (list.length > MK.shown) {
    const b = el('button', 'mk-more', `Yana ko‘rsatish (${list.length - MK.shown})`);
    b.onclick = () => { MK.shown += 60; mkGrid(view); }; more.appendChild(b);
  }
}
function mkSortMenu(chip, bar, view) {
  mkClosePop(); chip.classList.add('open');
  const ov = el('div', 'mk-ov'); ov.onclick = mkClosePop;
  const pop = el('div', 'mk-pop'); pop.style.left = Math.min(chip.offsetLeft, Math.max(0, bar.clientWidth - 300)) + 'px'; pop.style.width = '250px';
  SORTS.forEach(([k, label,, ic]) => {
    const r = el('button', 'mk-r' + (MK.sort === k ? ' on' : ''), `${MKI(ic)}<span>${label}</span>${CHECK}`);
    r.onclick = () => { MK.sort = k; MK.shown = 60; haptic('light'); mkClosePop(); mkBar(bar, view); mkGrid(view); };
    pop.appendChild(r);
  });
  bar.append(ov, pop);
}
function mkFilterMenu(f, chip, bar, view) {
  const [k, title, ck] = f;
  mkClosePop(); chip.classList.add('open');
  const cnt = new Map(); MK.items.forEach((g) => cnt.set(fk(g, k), (cnt.get(fk(g, k)) || 0) + 1));
  const opts = [...cnt.keys()].sort((x, y) => cnt.get(y) - cnt.get(x) || x - y);
  const ov = el('div', 'mk-ov'); ov.onclick = mkClosePop;
  const pop = el('div', 'mk-pop');
  pop.style.left = Math.min(chip.offsetLeft, Math.max(0, bar.clientWidth - 314)) + 'px';
  const sr = el('div', 'mk-s', `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input type="search" placeholder="Qidirish" autocomplete="off">`);
  const all = el('button', 'mk-r all', `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.300l2.800 2.800L16.200 9.500"/></svg><span>Hammasini tanlash</span>`);
  const list = el('div', 'mk-l');
  pop.append(sr, all, list);
  const isOn = (i) => !MK.sel[k] || MK.sel[k].has(i);
  const item = (i) => (k === 'm' ? (MODELS(Math.floor(i / 100))[i % 100] || { n: '' }) : CAT[ck][i]);
  const icon = (i) => {
    if (k === 'b') return `<i class="mk-dot" style="background:radial-gradient(circle at 35% 35%,${CAT.backdrops[i].c},${CAT.backdrops[i].e})"></i>`;
    if (k === 'p') return `<img class="mk-pt" alt="" src="pt/${pad3(i)}.png">`;
    return null;
  };
  const draw = () => {
    const q = sr.querySelector('input').value.trim().toLowerCase();
    MK.pop.forEach((v) => v.destroy()); MK.pop = [];
    list.replaceChildren();
    opts.filter((i) => !q || item(i).n.toLowerCase().includes(q)).forEach((i) => {
      const r = el('button', 'mk-r' + (isOn(i) ? ' on' : ''), `${icon(i) || '<i class="mk-ic"></i>'}<span>${san(item(i).n)}<b>${cnt.get(i)}</b></span>${CHECK}`);
      if (k === 'm') { const v = visual(48); MK.pop.push(v); v.model(i % 100, true, true, false, Math.floor(i / 100)); r.querySelector('.mk-ic').appendChild(v.el); }
      r.onclick = () => {
        if (!MK.sel[k]) MK.sel[k] = new Set(opts);
        MK.sel[k].has(i) ? MK.sel[k].delete(i) : MK.sel[k].add(i);
        if (MK.sel[k].size === opts.length) MK.sel[k] = null;
        haptic('light'); MK.shown = 60; r.classList.toggle('on', isOn(i)); chip.classList.toggle('act', !!MK.sel[k]); mkGrid(view);
      };
      list.appendChild(r);
    });
  };
  all.onclick = () => { MK.sel[k] = null; haptic('light'); chip.classList.remove('act'); MK.shown = 60; draw(); mkGrid(view); };
  sr.querySelector('input').oninput = draw;
  draw(); bar.append(ov, pop);
}
function mkBar(bar, view) {
  bar.replaceChildren();
  const cur = SORTS.find((x) => x[0] === MK.sort);
  const sc = el('button', 'mk-chip act', `${MKI(cur[3])}<span>${cur[2]}</span>`); sc.onclick = () => mkSortMenu(sc, bar, view); bar.appendChild(sc);
  FLT.forEach((f) => {
    const c = el('button', 'mk-chip' + (MK.sel[f[0]] ? ' act' : ''), `<span>${f[1]}</span>${UPDN}`);
    c.onclick = () => mkFilterMenu(f, c, bar, view); bar.appendChild(c);
  });
}
function renderMarket(view) {
  const wrap = el('div', 'mk');
  const bar = el('div', 'mk-bar');
  wrap.append(bar, el('div', 'mk-grid'), el('div', 'mk-more-w'));
  view.appendChild(wrap);
  const grid = wrap.querySelector('.mk-grid');
  const load = () => {
    grid.replaceChildren(el('div', 'empty', 'Yuklanmoqda…'));
    call('market').then((r) => {
      if (TAB !== 'market') return;
      MK.items = r.items; MK.shown = 60; mkBar(bar, view); mkGrid(wrap);
    }).catch((e) => {
      if (TAB !== 'market') return;
      grid.replaceChildren(el('div', 'empty', `${aerr(e)}<br><br><button class="btn" id="mk-retry">Qayta urinish</button>`));
      const b = grid.querySelector('#mk-retry'); if (b) b.onclick = load;
    });
  };
  if (MK.items) { mkBar(bar, view); mkGrid(wrap); }   // eski ro'yxatni darhol ko'rsatib, orqada yangilaymiz
  load();
}

// ---------- tugagan sovg'a ("Mavjud emas")
function openSoldOut(col) {
  clearSheet();
  const p2 = (n) => String(n).padStart(2, '0');
  const dt = (t) => { const d = t ? new Date(t) : null; return d && !isNaN(d) ? `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${p2(d.getFullYear() % 100)}, ${p2(d.getHours())}:${p2(d.getMinutes())}` : '—'; };
  const root = el('div', 'saved soldout');
  const top = el('div', 'sv-top'); const v = visual(360); sheetLive.push(v); v.plain('#ffffff', '#ffffff'); v.model('base', true, false, false, col.k); top.appendChild(v.el);
  root.appendChild(top);
  const b = el('div', 'sb');
  b.innerHTML = `<h3>Mavjud emas</h3><p class="so-red">Bu sovg‘a to‘liq sotilgan</p>
    <div class="tbl">${row('Birinchi sotuv', dt(col.first))}${row('Oxirgi sotuv', dt(col.last))}${row('Qiymati', `<em>${fmt(col.price)}</em>${star()}`)}${row('Mavjudligi', `${fmt(leftOf(col))} / ${fmt(col.supply)} qoldi`)}</div>`;
  const ok = el('button', 'btn ok', 'OK'); ok.onclick = closeSheet;
  b.appendChild(ok); root.appendChild(b); openSheet(root);
}

// ---------- sotib olish
function openBuy(k) {
  clearSheet();
  const col = COL(k == null ? OPEN_K() : k), left = leftOf(col), closed = !col.open || left <= 0;
  const root = el('div', 'buy');
  const top = el('div', 'by-top');
  top.innerHTML = `<div class="by-pill">Siz sovg‘ani <b>${fmt(col.price)}</b> Stars ga sotib olasiz</div>
    <div class="by-card"><div class="by-rib">1 / ${fmt(col.supply)}</div><div class="by-gift"></div>
      <h3>Saqlangan sovg‘a</h3><p>Bu sovg‘ani profilingizga qo‘shing yoki ${fmt(col.sell)} Stars ga almashtiring.</p>
      <button class="by-view" type="button">Ko‘rish</button></div>
    <input class="by-msg" type="text" maxlength="120" placeholder="Xabar yozing (ixtiyoriy)" autocomplete="off">`;
  const v = visual(300); sheetLive.push(v); v.plain('#ffffff', '#ffffff'); v.model('base', true, false, false, col.k, true);
  top.querySelector('.by-gift').appendChild(v.el);
  root.appendChild(top);
  const b = el('div', 'by-bot');
  b.innerHTML = `<div class="by-row"><span>Ismimni yashirish</span><label class="by-sw"><input type="checkbox"><i></i></label></div>
    <div class="by-hint">Ismim va xabarimni profilimga kirganlardan yashirish.</div>
    <div class="bar"><i style="width:${col.supply ? (left / col.supply) * 100 : 0}%"></i><span>${fmt(left)} qoldi</span><span>${fmt(col.sold)} sotilgan</span></div>
    <div class="by-hint">Hammasi sotilgach, ularni sotib olib bo‘lmaydi.</div>`;
  const btn = el('button', 'btn', `Sovg‘ani sotib olish ${star('#fff')} ${fmt(col.price)}`);
  if (closed) { btn.disabled = true; btn.textContent = 'Hammasi sotilgan'; }
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      const r = await call('buy', { kind: col.k });
      ME.gifts.unshift(r.gift); col.sold = r.sold; ME.balance = r.balance;
      haptic('medium'); refresh(); toast('Sovg‘a sotib olindi'); showSaved(r.gift);
    } catch (e) {
      toast(aerr(e)); btn.disabled = false;
      // Server "Hammasi sotilgan" desa: sonlarni serverdan qayta olamiz, karta o'z o'rniga (pastga) tushadi
      if (e && (e.code === 'SOLD_OUT' || (e.parameters && e.parameters.code === 'SOLD_OUT'))) { reload().then(() => { closeSheet(); }); }
    }
  };
  b.appendChild(btn); root.appendChild(b); openSheet(root);
}

// ---------- Saqlangan sovg'a (upgrade'gacha)
function showSaved(g) {
  clearSheet();
  const col = COL(g.k);
  const root = el('div', 'saved');
  const top = el('div', 'sv-top'); const v = visual(360); sheetLive.push(v); v.plain('#ffffff', '#ffffff'); v.model('base', true, false, false, g.k); top.appendChild(v.el);
  root.appendChild(top);
  const b = el('div', 'sb');
  const dt = g.d ? new Date(g.d) : null, p2 = (n) => String(n).padStart(2, '0');
  const when = dt && !isNaN(dt) ? `${p2(dt.getDate())}.${p2(dt.getMonth() + 1)}.${p2(dt.getFullYear() % 100)}, ${p2(dt.getHours())}:${p2(dt.getMinutes())}` : '—';
  b.innerHTML = `<h3>Saqlangan sovg‘a</h3><p>Bu sovg‘ani profilingizga qo‘shishingiz yoki ${fmt(col.sell)} Stars ga almashtirishingiz mumkin.</p>
    <div class="tbl">${row('Sana', when)}${row('Qiymati', `<em>${fmt(col.price)}</em>${star()}<button class="chip sell" id="sv-sell">${fmt(col.sell)} Stars ga sotish</button>`)}${row('Mavjudligi', `${fmt(leftOf(col))} / ${fmt(col.supply)} qoldi`)}${row('Holat', 'Unikal emas')}</div>
    <div class="vis-note" id="sv-vis"></div>`;
  const setVis = () => { b.querySelector('#sv-vis').innerHTML = g.h ? 'Bu sovg‘a profilingizda ko‘rinmaydi. <a>Ko‘rsatish ›</a>' : 'Bu sovg‘a profilingizda ko‘rinadi. <a>Yashirish ›</a>'; b.querySelector('#sv-vis a').onclick = async () => {
    try { await call('set', { id: g.id, op: 'hide' }); g.h = g.h ? 0 : 1; haptic('light'); setVis(); reload(); } catch (e) { toast(aerr(e)); } }; };
  setVis();
  const up = el('button', 'btn', 'Yaxshilash');
  up.onclick = () => openUpgrade(g);
  b.querySelector('#sv-sell').onclick = () => {
    const go = async (ok) => {
      if (!ok) return;
      try {
        const r = await call('sell', { id: g.id });
        ME.balance = r.balance; col.sold = Math.max(0, col.sold - 1); ME.gifts = ME.gifts.filter((x) => x.id !== g.id);
        closeSheet(); refresh(); toast(`+${fmt(r.got)} Stars olindi`);
      } catch (e) { toast(aerr(e)); }
    };
    if (tg && tg.showConfirm) tg.showConfirm(`Sovg‘a ${fmt(col.sell)} Stars ga almashtiriladi. Davom etasizmi?`, go); else go(confirm('Sotilsinmi?'));
  };
  b.appendChild(up); root.appendChild(b); openSheet(root);
}

// ---------- Yaxshilash oynasi
function openUpgrade(g) {
  clearSheet();
  const root = el('div');
  const h = hero({ bd: [bdRnd(g.k), rnd(CAT.patterns.length)], model: rmod(g.k), kind: g.k, h: 296, cls: 'upg', title: 'Sovg‘ani yaxshilash', sub: 'Sovg‘angizni sotish yoki o‘zingizda saqlash mumkin bo‘lgan noyob kolleksiya buyumiga aylantiring.' });
  root.appendChild(h);
  every(() => { h.v.backdrop(bdRnd(g.k), rnd(CAT.patterns.length), true); h.v.model(rmod(g.k), true, true, true, g.k); }, 2600);
  const b = el('div', 'sb up');
  b.innerHTML = `<div class="feat"><i>${ICON.diamond}</i><div><b>Noyob</b><span>Sovg‘angiz uchun noyob raqam, model, fon va naqsh oling.</span></div></div>
    <div class="feat"><i>${ICON.swap}</i><div><b>Uzatish mumkin</b><span>Kolleksiya sovg‘asini istalgan do‘stingizga yuborishingiz mumkin.</span></div></div>
    <div class="feat"><i>${ICON.gavel}</i><div><b>Savdo qilish mumkin</b><span>Sovg‘ani sotish, profilda saqlash yoki yashirish mumkin.</span></div></div>`;
  const label = `Yaxshilash ${star('#fff')} ${fmt(ME.upgradePrice)}`;
  const btn = el('button', 'btn pill-btn', label);
  btn.onclick = async () => {
    btn.disabled = true; btn.classList.add('busy'); btn.innerHTML = '<i class="spin"></i>';
    try {
      const r = await call('upgrade', { id: g.id });
      ME.balance = r.balance; COL(g.k).issued += 1;
      const i = ME.gifts.findIndex((x) => x.id === g.id); if (i >= 0) ME.gifts[i] = r.gift;
      head(); root.classList.add('leave'); later(() => runReveal(r.gift), 320);
    } catch (e) { toast(aerr(e)); btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = label; }
  };
  b.appendChild(btn); root.appendChild(b); openSheet(root);
}

// ---------- Natija: avval FON, keyin NAQSH, keyin MODEL aylanib (sekinlashib) to'xtaydi, so'ng yozuvlar
function runReveal(g) {
  clearSheet();
  refresh(); // ME allaqachon yangilangan (orqada)
  const root = el('div');
  const cur = { b: bdRnd(g.k), p: rnd(CAT.patterns.length), m: rmod(g.k) };
  const h = hero({ bd: [cur.b, cur.p], model: cur.m, kind: g.k, title: COL(g.k).name, sub: `#${fmt(g.no || 0)}` });
  h.querySelector('.hero-t').classList.add('wait');
  root.appendChild(h);
  const b = el('div', 'sb');
  const tbl = el('div', 'tbl glass-c');
  tbl.innerHTML = row('Fon', '<em class="ph">···</em>') + row('Naqsh', '<em class="ph">···</em>') + row('Model', '<em class="ph">···</em>') + row('Mavjudligi', `<em>${fmt(COL(g.k).issued)} / ${fmt(COL(g.k).sold)}</em>`);
  const rows = { b: tbl.children[0], p: tbl.children[1], m: tbl.children[2] };
  const items = { m: MODELS(g.k), p: CAT.patterns, b: CAT.backdrops };
  const setCell = (k, i, chip) => {
    const it = items[k][i];
    rows[k].lastChild.innerHTML = `<em class="tick">${it.n}</em>${chip ? (k === 'm' ? mChip(g.k, i) : `<span class="chip">${pct(k === 'b' ? bdP(g.k, i) : it.p)}</span>`) : ''}`;
  };
  const lock = (k, i) => { setCell(k, i, true); rows[k].classList.add('lock'); haptic('medium'); };
  const done = el('button', 'btn pill-btn', 'Yaxshi'); done.disabled = true;
  done.onclick = () => { closeSheet(); setTab('mine'); };
  b.append(tbl, done); root.appendChild(b); openSheet(root);

  const sleep = (ms) => new Promise((r) => later(r, ms));
  // ---- Tanlash ketma-ketligi (~5 soniya): fon×2 → model aylanadi → fon×2 → model → naqsh×2 → model → haqiqiy natija.
  // Model joyida almashadi (siljimaydi); # raqam ham to'xtovsiz o'zgarib turadi va oxirida haqiqiy raqamda to'xtaydi.
  const mdl = h.v.mdl, subEl = h.querySelector('.hero-t div'), cell = rows.m.parentNode.children[3];

  const setCls = (c) => { mdl.classList.remove('mland', 'mpulse'); void mdl.offsetWidth; if (c) mdl.classList.add(c); };
  const pool = [g.m, ...Array.from({ length: 4 }, () => rmod(g.k))];
  Promise.race([Promise.allSettled(pool.map((i) => loadModel(i, g.k))), sleep(700)]);   // modellar oldindan yuklanadi
  const flick = () => { h.v.model(pool[1 + rnd(pool.length - 1)], true, true, true, g.k); haptic('light'); };
  const bdSwap = async (kind, final) => {
    const n = CAT[kind === 'b' ? 'backdrops' : 'patterns'].length;
    const i = final != null ? final : (kind === 'b' ? bdRnd(g.k, cur.b) : rnd(n, cur[kind])); cur[kind] = i;
    h.v.backdrop(cur.b, cur.p, true); setCell(kind, i, false); haptic('light');
    await sleep(final != null ? 300 : 250);
  };
  const shuffle = async (n, gap) => { for (let i = 0; i < n; i++) { flick(); await sleep(gap + i * 15); } };
  const stage = async (kind) => { await bdSwap(kind); await bdSwap(kind); await shuffle(4, 105); };
  (async () => {
    await sleep(250);
    await stage('b'); await stage('b'); await stage('p');
    await bdSwap('b', g.b); lock('b', g.b);
    await bdSwap('p', g.p); lock('p', g.p);
    await shuffle(3, 120);
    cell.classList.add('lock');
    h.v.model(g.m, true, false, false, g.k, true); setCell('m', g.m, false); lock('m', g.m);
    setCls('mland');                                                     // tanlandi: joyida "pop" + yorug'lik
    const fl = el('i', 'flash'); h.appendChild(fl); later(() => fl.remove(), 900);
    await sleep(520);
    const t = h.querySelector('.hero-t');
    t.querySelector('h2').textContent = MDL(g).n; t.querySelector('div').textContent = `${COL(g.k).name} #${g.no || '…'}`;
    t.classList.remove('wait');
    confetti(); haptic('heavy'); try { tg.HapticFeedback.notificationOccurred('success'); } catch (e) {}
    toast('Sovg‘a endi noyob: raqam, model, fon va naqsh oldi');
    done.disabled = false;
  })();
}

// Telegram emoji-paketidagi (Lottie) belgilar: miniapp/ic/*.json. Oq rangda chiziladi, rangni CSS (.lic) boshqaradi.
const LIC = {};
function licon(name, sz = 30) {
  const b = el('span', 'lic'); b.style.width = b.style.height = sz + 'px';
  getLottie().then(async (L) => {
    if (!LIC[name]) LIC[name] = fetch(`ic/${name}.json`).then((r) => r.json());
    const data = await LIC[name];
    L.loadAnimation({ container: b, renderer: 'svg', loop: false, autoplay: false, animationData: structuredClone(data) });
  }).catch(() => {});
  return b;
}
// ---------- Noyob sovg'a tafsiloti
function showUnique(g, o) {
  clearSheet();
  const root = el('div');
  const h = hero({ bd: [g.b, g.p], model: g.m, kind: g.k, h: o ? 300 : 327, cls: o ? '' : 'own' });
  h.style.setProperty('--tint', mixHex(CAT.backdrops[g.b].c, '#ffffff', 0.66));
  h.appendChild(el('div', 'hero-t', `<h2>${COL(g.k).name} <small>#${g.no || '…'}</small></h2><div>${MDL(g).n}</div>`));
  const act = async (fn, ok) => { try { await fn(); haptic('medium'); closeSheet(); await reload(); if (ok) toast(ok); } catch (e) { toast(aerr(e)); } };
  if (!o) {
    const worn = ME.wear === g.id;
    const acts = el('div', 'hacts');
    const mk = (ic, label, fn) => { const x = el('button', 'hact glass-d'); if (typeof ic === 'string') x.innerHTML = ic; else x.appendChild(ic); x.appendChild(el('span', '', label)); x.onclick = fn; acts.appendChild(x); };
    mk(licon('transfer'), 'o‘tkazish', () => sendSheet(g));
    if (g.up && !g.s && CAT.extra && CAT.extra[g.k] && CAT.extra[g.k].cr) mk(ICON.craft, 'craft', () => craftSheet(g));
    mk(ICON.wear, worn ? 'yechish' : 'taqish', () => (worn ? act(() => call('set', { id: g.id, op: 'wear' }), 'Profildan yechildi') : wearSheet(g)));
    if (g.s) mk(licon('unsell'), 'olib tashlash', () => act(() => call('list', { id: g.id, price: 0 }), 'Sotuvdan olindi'));
    else mk(licon('sell'), 'sotish', () => sellSheet(g));
    h.appendChild(acts);
    const mx = el('button', 'mx glass-d', ICON.dots);
    const menu = el('div', 'pmenu hidden');
    const m1 = el('button', ''); m1.append(licon(g.n ? 'unpin' : 'pin', 26), el('span', '', g.n ? 'Mahkamlashni olib tashlash' : 'Mahkamlash'));
    m1.onclick = () => act(() => call('set', { id: g.id, op: 'pin' }));
    const m2 = el('button', '', `${ICON.trashL}<span>O‘chirish</span>`);
    m2.onclick = () => {
      const go = (ok) => ok && act(() => call('del', { id: g.id }).then(() => { const c = COL(g.k); c.sold = Math.max(0, c.sold - 1); if (g.up) c.issued = Math.max(0, c.issued - 1); }), 'Sovg‘a o‘chirildi');
      if (tg && tg.showConfirm) tg.showConfirm('Sovg‘a butunlay o‘chiriladi. Davom etasizmi?', go); else go(confirm('Sovg‘a o‘chirilsinmi?'));
    };
    menu.append(m1, m2);
    mx.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); };
    root.addEventListener('click', () => menu.classList.add('hidden'));
    h.append(mx, menu);
  }
  root.appendChild(h);
  const b = el('div', 'sb');
  const c = (k, i) => `<em>${CAT[k][i].n}</em><span class="chip">${pct(k === 'backdrops' ? bdP(g.k, i) : CAT[k][i].p)}</span>`;
  const on = o ? san(o.owner.name) : san(TU.first_name || 'Men');
  const who = `<i class="ava">${(on || 'S')[0]}</i><em class="own">${on}</em>`;
  b.innerHTML = `<div class="tbl">${row('Egasi', who)}${row('Model', `<em>${MDL(g).n}</em>${mChip(g.k, g.m)}`)}${row('Naqsh', c('patterns', g.p))}${row('Fon', c('backdrops', g.b))}${g.s ? row('Narx', `${star()}<em>${fmt(g.s)}</em>`) : ''}${row('Mavjudligi', `${fmt(COL(g.k).issued)}/${fmt(COL(g.k).sold)} chiqarilgan`)}</div>`;
  if (o) { const go = () => openProfile(o.owner.id); b.querySelector('.own').onclick = go; b.querySelector('.ava').onclick = go; }
  if (!o) {
    const vn = el('div', 'vis-note'); b.appendChild(vn);
    const setVis = () => { vn.innerHTML = g.h ? 'Bu sovg‘a profilingizda ko‘rinmaydi. <a>Ko‘rsatish ›</a>' : 'Bu sovg‘a profilingizda ko‘rinadi. <a>Yashirish ›</a>'; vn.querySelector('a').onclick = async () => {
      try { await call('set', { id: g.id, op: 'hide' }); g.h = g.h ? 0 : 1; haptic('light'); setVis(); reload(); } catch (e) { toast(aerr(e)); } }; };
    setVis();
  }
  const x = el('button', 'btn ok', 'OK'); x.onclick = closeSheet;
  if (o && g.s && o.owner.id !== TU.id) {
    x.innerHTML = `Sotib olish ${star('#fff')} ${fmt(g.s)}`;
    x.onclick = async () => {
      x.disabled = true;
      try { const r = await call('mbuy', { id: g.id }); ME.balance = r.balance; haptic('heavy'); closeSheet(); await reload(); toast('Sovg‘a sotib olindi'); confetti(); }
      catch (e) { toast(aerr(e)); x.disabled = false; }
    };
  }
  b.appendChild(x); root.appendChild(b); openSheet(root);
}
// ---------- Taqish: tushuntirish oynasi (Telegramdagidek)
function wearSheet(g) {
  clearSheet();
  const root = el('div', 'wear');
  const h = hero({ bd: [g.b, g.p], h: 232, cls: 'wr' });
  const bk = h.querySelector('.sx'); bk.innerHTML = ICON.back; bk.onclick = () => showUnique(g);
  const nm = san(TU.first_name || TU.username || 'Men');
  const av = el('div', 'wav'); av.textContent = nm[0].toUpperCase();
  if (TU.photo_url) { const im = new Image(); im.src = TU.photo_url; im.alt = ''; im.onerror = () => im.remove(); av.appendChild(im); }
  const t = el('div', 'wname', `<span>${nm}</span>`);
  const m = el('i', 'wm'); const mv = visual(48); sheetLive.push(mv); mv.model(g.m, true, false, false, g.k); m.appendChild(mv.el); t.appendChild(m);
  h.append(av, t); root.appendChild(h);
  const b = el('div', 'sb up wearb');
  b.innerHTML = `<h3>${COL(g.k).name} #${g.no || '…'} taqing</h3><p>va ushbu imtiyozlarni oling:</p>
    <div class="feat"><i>${ICON.diamond}</i><div><b>Miltillovchi nishon</b><span>Bu sovg‘a ismingiz yonida yaltiroq belgi bilan ko‘rsatiladi.</span></div></div>
    <div class="feat"><i>${ICON.fprof}</i><div><b>Unikal profil dizayni</b><span>Profilingiz bu sovg‘adagi bilan bir xil fon va belgiga ega bo‘ladi.</span></div></div>
    <div class="feat"><i>${ICON.badge}</i><div><b>Egalik isboti</b><span>Ismingiz yonidagi belgi bosilsa, sovg‘aning egasi va atributlari ko‘rsatiladi.</span></div></div>`;
  const btn = el('button', 'btn ok', `${ICON.lock}<span>Taqishni boshlash</span>`);
  btn.onclick = async () => {
    btn.disabled = true;
    try { await call('set', { id: g.id, op: 'wear' }); haptic('medium'); closeSheet(); await reload(); toast('Profilingizga taqildi'); }
    catch (e) { toast(aerr(e)); btn.disabled = false; }
  };
  b.appendChild(btn); root.appendChild(b); openSheet(root);
}
// ---------- Gift tayyorlash (craft) — Telegramdagidek: 4 ta slot + halqa, 3D kub animatsiyasi, natija + konfetti
const CR_STEP = 22;
const ANVIL = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h12.500a4.500 4.500 0 014.500 4.500V10h-4.200c-.5 1.700-1.800 3-3.800 3.300V15h2.500v2.500H8.500V15H11v-1.700C8.600 13 7 11.200 7 9H3zM17 11h4v1.500a2.500 2.500 0 01-2.500 2.500H17z"/><path d="M6 19h12v2H6z"/></svg>';
function craftThumb(g, sz) {
  const v = visual(sz); sheetLive.push(v);
  if (g) { v.backdrop(g.b, g.p); v.model(g.m, true, true, false, g.k); } else v.plain('#2c3b5e', '#1d2845');
  return v;
}
function craftSheet(g0) {
  clearSheet();
  const k = g0.k, cr = CAT.extra[k].cr, name = COL(k).name;
  const pool = ME.gifts.filter((x) => x.up && x.k === k && !x.s);
  const sel = [g0.id];
  const byId = (id) => pool.find((x) => x.id === id);
  const root = el('div', 'craft');
  const tiers = Object.keys(cr.tiers).sort((a, c) => cr.tiers[c].p - cr.tiers[a].p);
  const TCOL = { common: '#8e8e93', uncommon: '#34c759', rare: '#0a84ff', epic: '#af52de', legendary: '#ff9f0a' };
  const chance = () => Math.min(88, CR_STEP * sel.length);

  function main() {
    sheetLive.forEach((v) => v.destroy()); sheetLive = [];
    const b = el('div', 'sb cx-main');
    b.innerHTML = `<div class="ch"><button class="cbtn" id="cx" aria-label="Yopish">${ICON.x}</button><h3>Gift tayyorlash</h3><button class="cbtn" id="cq">?</button></div>
      <div class="cstage"><div class="ccol"><div class="cslot" data-i="0"></div><div class="cslot" data-i="1"></div></div>
        <div class="cmid"><i class="rip"></i><i class="rip r2"></i><div class="cring"><svg viewBox="0 0 100 100"><defs><linearGradient id="cgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cc4ff"/><stop offset="1" stop-color="#4f7bff"/></linearGradient></defs><circle cx="50" cy="50" r="44" class="bg"/><circle cx="50" cy="50" r="44" class="fg"/></svg><div class="cin"><span class="anv">${ANVIL}</span><b id="cpc">0%</b></div></div></div>
        <div class="ccol"><div class="cslot" data-i="2"></div><div class="cslot" data-i="3"></div></div></div>
      <p class="chint">4 tagacha sovg‘a qo‘shing, <b>${name}</b> tayyorlanadi.</p><p class="chint s">Omad kelmasa, bu sovg‘alar yo‘qoladi.</p>
      <div class="ctr" id="ctr"></div>`;
    root.replaceChildren(b);
    const slots = [...b.querySelectorAll('.cslot')];
    const fg = b.querySelector('.fg'); fg.style.strokeDasharray = '276.5';
    slots.forEach((s, i) => {
      const id = sel[i], g = id != null ? byId(id) : null;
      if (g) {
        s.classList.add('full'); s.style.setProperty('--d', i * 60 + 'ms');
        s.appendChild(craftThumb(g, 130).el);
        s.appendChild(el('em', 'cpl', '+' + CR_STEP + '%'));
        if (sel.length > 1) { const x = el('button', 'cdel', '×'); x.onclick = (e) => { e.stopPropagation(); sel.splice(i, 1); haptic('light'); main(); }; s.appendChild(x); }
      } else {
        s.classList.add('add'); s.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>';
        s.onclick = () => { haptic('light'); picker(); };
      }
    });
    const pc = b.querySelector('#cpc'), c = chance();
    fg.style.strokeDashoffset = '276.5'; requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.strokeDashoffset = String(276.5 * (1 - c / 100)); }));
    let n = 0; const t0 = performance.now(); (function tick(t) { const p = Math.min(1, (t - t0) / 650); pc.textContent = Math.round(c * (1 - Math.pow(1 - p, 3))) + '%'; if (p < 1) requestAnimationFrame(tick); })(t0);
    b.querySelector('#ctr').innerHTML = tiers.map((t, i) => `<div class="ct" style="--c:${TCOL[t] || '#8e8e93'};--p:${cr.tiers[t].p};--i:${i}"><i><b>${cr.tiers[t].p}%</b></i><span>${TIERN[t]}</span></div>`).join('');
    b.querySelector('#cx').onclick = closeSheet;
    b.querySelector('#cq').onclick = () => toast('Har bir sovg‘a omadni +22% oshiradi (88% gacha). Omad kelmasa sovg‘alar yo‘qoladi.');
    const go = el('button', 'cgo', `<span>${name} tayyorlash</span><small>Muvaffaqiyat ehtimoli ${c}%</small>`);
    go.onclick = () => { haptic('medium'); run(); };
    b.appendChild(go);
  }
  function picker() {
    const b = el('div', 'sb cx-pick');
    const left = pool.filter((x) => !sel.includes(x.id));
    b.innerHTML = `<div class="ch"><button class="cbtn" id="cx">${ICON.x}</button><h3>Sovg‘ani tanlang</h3><span class="cbtn" style="visibility:hidden"></span></div><div class="cpt">SIZNING SOVG‘ALARINGIZ</div><div class="cgrid" id="cg"></div>`;
    root.replaceChildren(b);
    b.querySelector('#cx').onclick = () => { haptic('light'); main(); };
    const grid = b.querySelector('#cg');
    if (!left.length) grid.appendChild(el('div', 'cempty', 'Boshqa yaxshilangan sovg‘a yo‘q'));
    left.forEach((g, i) => { const t = tileEl(g, i, sheetLive, () => { sel.push(g.id); haptic('medium'); main(); }, 160); t.style.setProperty('--d', Math.min(i, 12) * 35 + 'ms'); grid.appendChild(t); });
  }
  async function run() {
    const ids = [...sel], gs = ids.map(byId);
    sheetLive.forEach((v) => v.destroy()); sheetLive = [];
    const b = el('div', 'sb cx-run');
    b.innerHTML = `<div class="ch"><span class="cbtn" style="visibility:hidden"></span><h3>Tayyorlash</h3><span class="cbtn" style="visibility:hidden"></span></div>
      <div class="cfx"><div class="aura"></div><i class="rip"></i><i class="rip r2"></i><i class="rip r3"></i>
        <div class="orb"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="cside l"></div><div class="cside r"></div>
        <div class="cube3"><div class="cube" id="cube"><div class="f f0"></div><div class="f f1"></div><div class="f f2"></div><div class="f f3"></div><div class="f f4"></div><div class="f f5"></div></div></div></div>
      <h4 id="cst">Tayyorlanmoqda</h4><div class="csub">${name} #1</div><div class="cpill">Muvaffaqiyat ehtimoli ${chance()}%</div>`;
    root.replaceChildren(b);
    const cube = b.querySelector('#cube'), F = [...cube.children], fx = b.querySelector('.cfx');
    const sides = [b.querySelector('.cside.l'), b.querySelector('.cside.r')], sl = [];
    gs.forEach((g, i) => { const s = el('div', 'cs'); s.appendChild(craftThumb(g, 110).el); sides[i % 2].appendChild(s); sl.push(s); });
    // yon yuzlar: tanlangan sovg'alar (aylanib turadi), tepa/past: sandon belgisi, old yuz: natija uchun
    const face = (i, g) => { F[i].replaceChildren(); if (g) F[i].appendChild(craftThumb(g, 150).el); else F[i].innerHTML = `<span class="anv">${ANVIL}</span>`; };
    face(0, null); face(1, gs[0]); face(2, gs[1] || gs[0]); face(3, gs[2] || gs[0]); face(4, null); face(5, gs[3] || gs[0]);
    F[0].classList.add('q'); F[0].innerHTML = '<span class="qm">?</span>';
    const sleep = (ms) => new Promise((r) => later(r, ms));
    const rot = (rx, ry, ms, ease) => { cube.style.transition = `transform ${ms}ms ${ease || 'cubic-bezier(.3,1.3,.5,1)'}`; cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
    requestAnimationFrame(() => fx.classList.add('on'));
    let res = null, err = null, done = false;
    call('craft', { ids }).then((r) => { res = r; }).catch((e) => { err = e; }).finally(() => { done = true; });
    await sleep(700);
    // sovg'alar markazga so'riladi (tortilib kichrayadi), kub har gal "urilib" aylanadi
    sl.forEach((s, i) => later(() => { s.classList.add('eat'); haptic('light'); fx.classList.remove('hit'); void fx.offsetWidth; fx.classList.add('hit'); }, 300 + i * 420));
    let ry = 0, step = 0; const T0 = Date.now();
    while (step < 6 || !done || Date.now() - T0 < 3800) {
      step++; ry -= 90; const rx = [-24, 22, -18, 26, -22, 18][step % 6];
      rot(rx, ry, 560); haptic('light'); await sleep(580);
      if (step > 14) break;
    }
    if (err) { toast(aerr(err)); closeSheet(); await reload(); return; }
    // keyingi qadamda old yuz (0) orqada bo'lishi uchun: ry 90 ning toq karrasi bo'lsin
    if (((ry % 360) + 360) % 360 === 0) { ry -= 90; rot(-20, ry, 520); await sleep(540); }
    await reload();
    const win = !!(res && res.ok && res.gift), G = win ? (ME.gifts.find((x) => x.id === res.gift.id) || res.gift) : null;
    if (win) { F[0].classList.remove('q'); face(0, G); } else { F[0].classList.remove('q'); F[0].classList.add('bad'); F[0].innerHTML = '<span class="qm">✕</span>'; }
    // oxirgi aylanish: old yuz (natija) ko'rinadigan holatda to'xtaydi
    const end = Math.floor(ry / 360) * 360 - 360;
    rot(0, end, 1500, 'cubic-bezier(.2,.9,.25,1.08)'); haptic('medium');
    b.querySelector('#cst').textContent = win ? 'Tayyor!' : 'Omad kelmadi';
    await sleep(1400);
    if (win) {
      haptic('heavy'); try { tg.HapticFeedback.notificationOccurred('success'); } catch (e) {}
      fx.classList.add('boom'); confetti(3400); await sleep(650);
      root.classList.add('out'); await sleep(260);
      showUnique(G); root.classList.remove('out');
      const sb = $('#sheet-body'); const again = el('button', 'btn pill-btn', 'Yana tayyorlash'); again.onclick = () => { const x = ME.gifts.filter((y) => y.up && y.k === k && !y.s); if (x.length) craftSheet(x[0]); else toast('Boshqa sovg‘a yo‘q'); };
      const last = sb.querySelector('.sb:last-child'); (last || sb).appendChild(again);
      setTimeout(() => confetti(2600), 200);
    } else {
      try { tg.HapticFeedback.notificationOccurred('error'); } catch (e) {}
      fx.classList.add('shake'); await sleep(800);
      const f = el('div', 'sb cx-fail'); f.innerHTML = `<div class="ch"><span class="cbtn" style="visibility:hidden"></span><h3>Omad kelmadi</h3><span class="cbtn" style="visibility:hidden"></span></div><div class="fx">${ANVIL.replace('<svg', '<svg class="big"')}</div><p>Tanlangan ${ids.length} ta sovg‘a yo‘qoldi. Qayta urinib ko‘ring.</p>`;
      const x = el('button', 'cgo', '<span>Yopish</span>'); x.onclick = closeSheet; f.appendChild(x); root.replaceChildren(f);
    }
  }
  main(); openSheet(root); root.classList.add('cin-anim');
}
function sellSheet(g) {
  clearSheet();
  const b = el('div', 'sb'); b.style.paddingTop = '24px';
  b.innerHTML = `<h3>Sovg‘ani sotish</h3><p>Sovg‘a bozorda sotuvga qo‘yiladi.</p>
    <div class="minp"><div><span>Eng kam narx</span><b>${fmt(ME.minPrice || 70)}</b></div><label>${star()}<input id="pr" type="number" inputmode="numeric" placeholder="Narxni kiriting"></label></div>
    <div class="note" id="pn">Siz 95% olasiz.</div>`;
  const btn = el('button', 'btn', 'Sotish');
  const inp = b.querySelector('#pr');
  inp.oninput = () => { const v = Math.floor(Number(inp.value) || 0); b.querySelector('#pn').textContent = v ? `Siz ${fmt(Math.floor(v * 0.95))} Stars olasiz (95%).` : 'Siz 95% olasiz.'; };
  btn.onclick = async () => {
    btn.disabled = true;
    try { await call('list', { id: g.id, price: inp.value }); haptic('medium'); closeSheet(); await reload(); toast('Sotuvga qo‘yildi'); }
    catch (e) { toast(aerr(e)); btn.disabled = false; }
  };
  b.appendChild(btn); openSheet(b); setTimeout(() => inp.focus(), 250);
}
function sendSheet(g) {
  clearSheet();
  const b = el('div', 'sb'); b.style.paddingTop = '24px';
  b.innerHTML = `<h3>Sovg‘a qilish</h3><p>Foydalanuvchi @username yoki ID raqamini kiriting (u ilovaga kirgan bo‘lishi kerak).</p><input class="inp" id="to" placeholder="@username yoki ID" autocomplete="off">`;
  const btn = el('button', 'btn', 'Yuborish');
  btn.onclick = async () => {
    btn.disabled = true;
    try { const r = await call('send', { id: g.id, to: b.querySelector('#to').value, chat: 1 }); haptic('heavy'); closeSheet(); await reload(); toast(`${san(r.to)} ga yuborildi`); }
    catch (e) { toast(aerr(e)); btn.disabled = false; }
  };
  b.appendChild(btn); openSheet(b);
}
// ---------- Boshqa foydalanuvchi profili (to'liq sahifa)
let PF = null;
function closeProf() {
  if (!PF) return;
  const n = PF.el; PF.live.forEach((v) => v.destroy()); PF = null;
  n.classList.remove('on'); document.body.classList.remove('in-prof'); setTimeout(() => n.remove(), 280);
}
function pinFloat(pins, reg, k) {
  const fl = el('div', 'pfl');
  pins.slice(0, 6).forEach((g, i) => {
    const sl = PSLOT[i], it = el('i', 'pfi');
    it.style.cssText = `--x:${sl[0] * k}px;--y:${sl[1] * k}px;--z:${sl[2] * k}px;--c:${g.up ? CAT.backdrops[g.b].c : '#9cc8ff'}`;
    const v = visual(96); reg.push(v); v.model(g.up ? g.m : 'base', true, !SET.anim, false, g.k); it.appendChild(v.el); fl.appendChild(it);
  });
  return fl;
}
async function openProfile(id) {
  if (id === TU.id) { closeProf(); closeSheet(); setTab('mine'); return; }
  if (PF && PF.id === id) { closeSheet(); return; }
  closeSheet(); closeProf();
  const root = el('div', 'prof'), live = [];
  PF = { id, el: root, live };
  const back0 = el('button', 'pback', ICON.back); back0.onclick = closeProf;
  const ph0 = el('div', 'pph'); ph0.appendChild(back0);
  root.append(ph0, el('div', 'empty', 'Yuklanmoqda…'));
  document.body.append(root); document.body.classList.add('in-prof');
  requestAnimationFrame(() => root.classList.add('on'));
  try {
    const r = await call('profile', { id });
    if (!PF || PF.el !== root) return;
    const w = r.wear, nm = san(r.name) || 'Foydalanuvchi', hue = (Math.abs(r.id) * 47) % 360;
    const head = el('div', 'pph');
    if (w) { const v = visual(960, 640); live.push(v); v.backdrop(w.b, w.p); head.appendChild(v.el); }
    else head.style.background = `linear-gradient(180deg,hsl(${hue} 52% 50%),hsl(${hue} 56% 33%))`;
    const back = el('button', 'pback', ICON.back); back.onclick = closeProf;
    const av = el('div', 'pav2'); av.textContent = nm[0].toUpperCase();
    if (r.photo) { const im = new Image(); im.src = r.photo; im.alt = ''; im.onerror = () => im.remove(); av.appendChild(im); }
    const wrap = el('div', 'pwrap'); wrap.append(pinFloat(r.gifts.filter((g) => g.n), live, 1.2), av);
    const t = el('div', 'pname2', `<span>${nm}</span>`);
    if (w) { const m = el('i', 'wm'); const v = visual(48); live.push(v); v.model(w.m, true, false, false, w.k); m.appendChild(v.el); t.appendChild(m); }
    decorate(t, { prem: r.prem, st: r.st }, 22);
    const upN = r.gifts.filter((g) => g.up).length;
    head.append(back, wrap, t, el('div', 'psub', `${r.gifts.length} ta sovg‘a · ${upN} ta noyob`));
    const info = el('div', 'pinfo');
    if (r.username) {
      const row = el('button', 'pi', `<small>username</small><b>@${san(r.username)}</b>`);
      row.onclick = () => { const u = 'https://t.me/' + r.username; try { tg.openTelegramLink(u); } catch (e) { window.open(u, '_blank'); } };
      info.appendChild(row);
    }
    info.appendChild(el('div', 'pi', `<small>ID</small><b>${r.id}</b>`));
    const msg = el('button', 'btn', 'Xabar yozish');
    msg.onclick = () => { closeProf(); CHAT && CHAT.openDM(r.id, r.name); };
    const pill = el('div', 'pgl', `<span>Sovg‘alar</span>`);
    r.gifts.filter((g) => g.up).slice(0, 3).forEach((g) => { const m = el('i', 'wm sm'); const v = visual(48); live.push(v); v.model(g.m, true, true, false, g.k); m.appendChild(v.el); pill.appendChild(m); });
    const grid = el('div', 'pgrid');
    lazyGrid(grid, [...r.gifts].sort((x, y) => (y.n || 0) - (x.n || 0)), (g, i) => tileEl(g, i, live, () => { if (g.up) showUnique(g, { owner: { id: r.id, name: r.name } }); }, 160), live);
    if (!r.gifts.length) grid.appendChild(el('div', 'empty', 'Hali sovg‘a yo‘q.'));
    root.replaceChildren(head, info, msg, pill, grid);
  } catch (e) { toast(aerr(e)); closeProf(); }
}

// ---------- Reyting
async function openBoard() {
  clearSheet();
  const root = el('div', 'sb'); root.style.paddingTop = '24px';
  root.innerHTML = '<h3>Reyting</h3><p>Noyob sovg‘alar soni bo‘yicha</p><div class="lb"><div><span>Yuklanmoqda…</span></div></div>';
  openSheet(root);
  try {
    const r = await call('board');
    const lb = root.querySelector('.lb');
    lb.innerHTML = r.top.length
      ? r.top.map((a) => `<div class="${a.me ? 'me' : ''}" data-id="${a.id}" style="cursor:pointer"><em>${a.rank}</em><span>${a.name.replace(/[<>&]/g, '')}</span><small>${a.up} noyob · ${a.total} ta</small></div>`).join('')
      : '<div><span>Hali hech kim yo‘q</span></div>';
    lb.querySelectorAll('[data-id]').forEach((d) => { d.onclick = () => openProfile(Number(d.dataset.id)); });
    if (r.myRank) root.appendChild(el('div', 'note', `Sizning o‘rningiz: ${r.myRank}`));
  } catch (e) { toast(aerr(e)); }
  const x = el('button', 'btn sec', 'Yopish'); x.onclick = closeSheet; root.appendChild(x);
}


// ---------- Pastki panel: shisha linza (bosish yoki sekin sudrab o'tkazish)
const NB = $('.navbar'), LENS = $('#lens'), NBTNS = [...NB.querySelectorAll('[data-tab]')];
let lensX = 0, dragged = false;
function lensTo(i, anim) {
  const b = NBTNS[i]; if (!b) return;
  LENS.style.width = b.offsetWidth + 'px'; lensX = b.offsetLeft; LENS.style.setProperty('--x', lensX + 'px');
}
function syncLens() {
  const i = NBTNS.findIndex((b) => b.dataset.tab === TAB);
  LENS.classList.toggle('off', i < 0);
  if (i >= 0) lensTo(i);
}
(function lensDrag() {
  let id = null, x0 = 0, l0 = 0, on = false, near = 0;
  const lo = () => NBTNS[0].offsetLeft, hi = () => NBTNS[NBTNS.length - 1].offsetLeft;
  const nearest = () => { const c = lensX + LENS.offsetWidth / 2; let bi = 0, bd = 1e9; NBTNS.forEach((b, i) => { const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - c); if (d < bd) { bd = d; bi = i; } }); return bi; };
  NB.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    id = e.pointerId; x0 = e.clientX; on = false;
    const i = NBTNS.findIndex((b) => b.contains(e.target));
    l0 = i >= 0 ? NBTNS[i].offsetLeft : lensX; near = i >= 0 ? i : 0;
    if (!LENS.classList.contains('off')) l0 = lensX;
  });
  NB.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - x0;
    if (!on) {
      if (Math.abs(dx) < 6) return;
      on = true; dragged = true; try { NB.setPointerCapture(id); } catch (_) {}
      if (LENS.classList.contains('off')) { LENS.style.width = NBTNS[near].offsetWidth + 'px'; lensX = l0; LENS.style.setProperty('--x', lensX + 'px'); LENS.getBoundingClientRect(); }
      LENS.classList.remove('off'); LENS.classList.add('drag'); NB.classList.add('dragging');
    }
    lensX = Math.max(lo(), Math.min(hi(), l0 + dx));
    LENS.style.setProperty('--x', lensX + 'px');
    const n = nearest();
    if (n !== near) { near = n; haptic('light'); }
    NBTNS.forEach((b, i) => b.classList.toggle('hl', i === near));
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    if (!on) return;
    on = false; NB.classList.remove('dragging'); LENS.classList.remove('drag'); NBTNS.forEach((b) => b.classList.remove('hl'));
    const t = NBTNS[near].dataset.tab;
    lensTo(near);
    if (t !== TAB) { haptic('medium'); setTab(t); } else syncLens();
    setTimeout(() => { dragged = false; }, 60);
  };
  NB.addEventListener('pointerup', end); NB.addEventListener('pointercancel', end);
  NB.addEventListener('click', (e) => { if (dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  window.addEventListener('resize', syncLens);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncLens);
  window.addEventListener('load', syncLens);
})();

// ---------- ishga tushirish
$('#btn-board').onclick = openBoard;
// Balans tugmasidagi yulduz o'rniga animatsiyali emoji (data/star.json)
(async () => {
  try {
    const [L, d] = await Promise.all([getLottie(), fetch('data/star.json').then((r) => r.json())]);
    const box = $('#btn-bal .sico');
    const an = L.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: false, animationData: d });
    track(an, box, { poster: 0 });
    an.addEventListener('DOMLoaded', () => box.classList.add('on'));
  } catch (e) {}
})();
// Reyting tugmasidagi kubok o'rniga animatsiyali emoji (data/board.json)
(async () => {
  try {
    const [L, d] = await Promise.all([getLottie(), fetch('data/board.json').then((r) => r.json())]);
    const box = $('#btn-board .bico');
    const an = L.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: false, animationData: d });
    track(an, box, { poster: 0 });
    an.addEventListener('DOMLoaded', () => box.classList.add('on'));
  } catch (e) {}
})();
// Yangi yulduz (data/star2.json): balansdan tashqari barcha `svg.star` o'rniga.
// Animatsiya o'chiq bo'lsa yoki kartalar ro'yxatida (.pbadge, .price) bo'lsa — yengil rasm (<img>), Lottie ishlamaydi.
let STAR2 = null, STAR_IMG = null;
const star2 = () => STAR2 || (STAR2 = Promise.all([getLottie(), fetch('data/star2.json').then((r) => r.json())]));
function starStatic() {   // yulduzning to'xtatilgan kadri bir marta SVG rasmga aylantiriladi va hamma joyda qayta ishlatiladi
  return STAR_IMG || (STAR_IMG = star2().then(([L, d]) => new Promise((res, rej) => {
    const tmp = document.createElement('div'); tmp.style.cssText = 'position:fixed;left:-999px;top:0;width:96px;height:96px;visibility:hidden';
    document.body.appendChild(tmp);
    const an = L.loadAnimation({ container: tmp, renderer: 'svg', loop: false, autoplay: false, animationData: d });
    an.addEventListener('DOMLoaded', () => {
      try { an.goToAndStop(139, true); res('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(tmp.querySelector('svg')))); }
      catch (err) { rej(err); }
      finally { setTimeout(() => { try { an.destroy(); } catch (_) {} tmp.remove(); }, 0); }
    });
  })).catch((err) => { STAR_IMG = null; throw err; }));
}
function hydrateStars(root) {
  const list = (root.matches && root.matches('svg.star') ? [root] : []).concat([...(root.querySelectorAll ? root.querySelectorAll('svg.star') : [])]);
  list.forEach((sv) => {
    if (sv.dataset.ls || sv.closest('.sico,.gs-bal')) return;
    sv.dataset.ls = '1';
    const live = animOn() && !sv.closest('.pbadge,.price');
    if (!live) {
      starStatic().then((src) => {
        if (!sv.isConnected) return;
        const im = new Image(); im.src = src; im.className = 'star lstar on'; im.alt = ''; im.draggable = false;
        sv.replaceWith(im);
      }).catch(() => {});
      return;
    }
    star2().then(([L, d]) => {
      if (!sv.isConnected) return;
      const box = document.createElement('span'); box.className = 'star lstar';
      sv.after(box);
      const an = L.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: false, animationData: d });
      track(an, box, { poster: 139 });
      an.addEventListener('DOMLoaded', () => { box.classList.add('on'); sv.remove(); });
    }).catch(() => {});
  });
}
new MutationObserver((ms) => {
  ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType === 1) hydrateStars(n); }));
}).observe(document.body, { childList: true, subtree: true });
hydrateStars(document.body);
// ---------- Stars sotib olish (Telegram Stars -> Gift Lab Stars)
const STK = { data: null };
function stkData() {
  return STK.data || (STK.data = Promise.all([getLottie(), ...[1, 2, 3].map((i) => fetch(`data/stk${i}.json`).then((r) => r.json()))]).catch((e) => { STK.data = null; throw e; }));
}
const TGLOGO = '<span class="stk-tg"><svg viewBox="0 0 24 24" width="15" height="15"><path fill="#fff" d="M20.7 4.3L3.2 11c-.8.3-.8 1.4 0 1.6l4.3 1.4 1.7 5.2c.2.6 1 .8 1.4.3l2.4-2.3 4.5 3.3c.6.4 1.4.1 1.6-.6L22 5.4c.2-.9-.6-1.5-1.3-1.1zM9.5 13.6l8.2-5.1-6.3 6.1-.3 2.9z"/></svg></span>';
function openBuyStars() {
  clearSheet();
  const rate = (ME && ME.starRate) || 50, tgMin = (ME && ME.tgMin) || 20, tgMax = (ME && ME.tgMax) || 200;
  const packs = (ME && ME.packs) || [1000, 5000, 7500, 10000];
  const tier = (i) => (i === 0 ? 1 : i >= packs.length - 1 ? 3 : 2);     // paket kattalashgan sari yulduz ikonasi 1 -> 2 -> 3
  let give = 0, busy = false;
  const links = new Map(), prep = {};   // oldindan tayyorlangan invoys havolalari (tg miqdor -> Promise)
  const prefetch = (n) => { if (!links.has(n)) { const pr = call('topup', { tg: n }); links.set(n, pr); pr.catch(() => links.delete(n)); } return links.get(n); };
  const root = el('div', 'stk');
  root.innerHTML = `<h2>Buy Stars</h2><p>You can exchange your Telegram Stars for stars in Gift Lab.</p>
    <div class="stk-list">${packs.map((n, i) => `<button type="button" class="stk-row" data-tg="${Math.round(n / rate)}"><span class="stk-an" data-t="${tier(i)}"></span><b>${fmt(n)} Stars</b><span class="stk-pr">${fmt(Math.round(n / rate))}${star('#f5a300')}</span></button>`).join('')}</div>
    <div class="stk-card" id="stk-card">
      <div class="stk-box"><div><small>You give</small><div class="stk-num"><input id="stk-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="0">${star('#f5a300')}</div></div><span class="stk-chip">${TGLOGO}Telegram</span></div>
      <div class="stk-mid"><i><svg viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M6 13l6 6 6-6"/></svg></i></div>
      <div class="stk-box"><div><small>You receive</small><div class="stk-num"><span class="stk-out" id="stk-out">0</span>${star('#f5a300')}</div></div><span class="stk-chip"><span class="stk-gl">${ICON.gift}</span>Gift Lab</span></div>
    </div>`;
  const input = root.querySelector('#stk-in'), out = root.querySelector('#stk-out'), card = root.querySelector('#stk-card');
  const btn = el('button', 'btn stk-btn', '');
  const rows = [...root.querySelectorAll('.stk-row')];
  const ok = () => give >= tgMin && give <= tgMax;
  const paint = () => {
    out.textContent = fmt(give * rate);
    input.style.width = Math.max(1, String(input.value || '').length) + 'ch';
    card.classList.toggle('bad', give > 0 && !ok());
    btn.innerHTML = `Top up for ${star('#fff')} ${fmt(give)}`;
    btn.disabled = busy || !ok();
    rows.forEach((r) => r.classList.toggle('on', Number(r.dataset.tg) === give));
  };
  const setGive = (n, fromInput) => {
    give = Math.max(0, Math.floor(Number(n) || 0));
    if (!fromInput) input.value = give ? String(give) : '';
    paint();
    clearTimeout(prep.t); if (ok()) prep.t = setTimeout(() => prefetch(give), fromInput ? 300 : 0);
  };
  input.oninput = () => { const d = input.value.replace(/\D/g, '').replace(/^0+/, ''); input.value = d; setGive(Number(d) || 0, true); };
  rows.forEach((r) => { r.onclick = () => { haptic('light'); setGive(Number(r.dataset.tg)); }; });
  btn.onclick = async () => {
    if (busy || !ok()) return;
    busy = true; btn.classList.add('busy'); paint();
    const before = ME ? ME.balance : null;
    const done = () => { busy = false; btn.classList.remove('busy'); paint(); };
    try {
      const r = await prefetch(give);
      if (!tg || !tg.openInvoice) throw { message: 'Telegram’ni yangilang' };
      tg.openInvoice(r.link, async (st) => {
        if (st === 'paid') {
          haptic('heavy'); toast('To‘lov qabul qilindi…');
          for (let i = 0; i < 10; i++) { await reload(); if (ME.balance === null || ME.balance !== before) break; await new Promise((x) => setTimeout(x, 1000)); }
          closeSheet(); toast('Stars hisobingizga qo‘shildi'); confetti();
        } else if (st === 'failed') { toast('To‘lov amalga oshmadi'); done(); }
        else { links.delete(give); done(); }   // cancelled / pending
      });
    } catch (e) { toast(aerr(e)); done(); }
  };
  const bot = el('div', 'stk-bot'); bot.appendChild(btn); root.appendChild(bot);
  setGive(Math.round(packs[0] / rate));
  openSheet(root);
  // paket ikonalari: 1 / 2 / 3 chiziqli animatsiyali yulduz (Lottie)
  stkData().then(([L, ...ds]) => {
    if (!root.isConnected) return;
    root.querySelectorAll('.stk-an').forEach((box) => {
      const an = L.loadAnimation({ container: box, renderer: 'svg', loop: true, autoplay: false, animationData: structuredClone(ds[Number(box.dataset.t) - 1]) });
      track(an, box, { poster: 30, force: true });
    });
  }).catch(() => {});
}
// ---------- Premium (ilovadagi Stars bilan) va emoji-status
const PREM_PATH = '<path d="M12 2.5l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.4 6 20.6l1.3-6.6L2.4 9.4l6.7-.8z"/>';
const LOCK_SVG = '<svg viewBox="0 0 24 24"><path d="M7 10V7.5a5 5 0 0110 0V10h.5a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.5v-8A1.5 1.5 0 016.5 10zm2 0h6V7.5a3 3 0 00-6 0z"/></svg>';
const isPrem = () => !!(ME && ME.prem && ME.prem > Date.now());
const dateStr = (ms) => { const d = new Date(ms); return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`; };
const planName = (m) => (m === 12 ? '1 yil' : `${m} oylik`);

function openPremium() {
  clearSheet();
  const plans = (ME && ME.plans) || [{ m: 3, price: 200 }, { m: 6, price: 300 }, { m: 12, price: 500 }];
  const per = (p) => p.price / p.m, base = per(plans[0]);                        // eng qisqa reja — asos narx
  const off = (p) => Math.round((1 - per(p) / base) * 100);                     // chegirma foizi (oyiga narx bo'yicha)
  let sel = Math.min(1, plans.length - 1), busy = false;
  const root = el('div', 'sb pm');
  root.innerHTML = `<div class="pm-hero"><div class="pm-orb"><svg viewBox="0 0 24 24">${PREM_PATH}</svg></div></div>
    <h3>Premium</h3>
    <p>${isPrem() ? `Faol: ${dateStr(ME.prem)} gacha. Yangi reja tanlasangiz, muddat ustiga qo‘shiladi.` : 'Ismingiz yonida maxsus belgi va jonli emoji-status.'}</p>
    <div class="pm-plans"></div>
    <ul class="pm-feat">
      <li><i><svg viewBox="0 0 24 24">${PREM_PATH}</svg></i><div><b>Premium belgisi</b><span>Chat, hikoya va profilda ismingiz yonida ko‘rinadi</span></div></li>
      <li><i><svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 3a9 9 0 100 18 9 9 0 000-18zM9 9.2a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zm6 0a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4zM7.7 14h8.6a4.3 4.3 0 01-8.6 0z"/></svg></i><div><b>Emoji status</b><span>14 ta animatsion status — ism yonida turadi</span></div></li>
    </ul>`;
  const wrap = root.querySelector('.pm-plans');
  const btn = el('button', 'btn', '');
  const paint = () => {
    [...wrap.children].forEach((b, i) => b.classList.toggle('on', i === sel));
    btn.innerHTML = `${isPrem() ? 'Uzaytirish' : 'Sotib olish'} ${star('#fff')} ${fmt(plans[sel].price)}`;
    btn.disabled = busy;
  };
  plans.forEach((p, i) => {
    const b = el('button', 'pm-plan', `${off(p) > 0 ? `<span class="pm-off">−${off(p)}%</span>` : ''}<b>${planName(p.m)}</b><span class="pm-pr">${star('#f5a300')}${fmt(p.price)}</span><small>${fmt(Math.round(per(p)))} / oy</small>`);
    b.type = 'button'; b.onclick = () => { sel = i; haptic('light'); paint(); }; wrap.appendChild(b);
  });
  btn.onclick = () => {
    if (busy) return; const p = plans[sel];
    const go = async (ok) => {
      if (!ok) return; busy = true; paint();
      try {
        await call('premium', { plan: p.m });
        haptic('heavy'); await reload(); closeSheet(); confetti(); toast('Premium faollashdi'); setTimeout(openStatus, 450);
      } catch (e) {
        busy = false; paint(); toast(aerr(e));
        if (e && e.parameters && e.parameters.code === 'NO_STARS') setTimeout(openBuyStars, 700);
      }
    };
    const t = `${planName(p.m)} Premium — ${fmt(p.price)} Stars. Sotib olasizmi?`;
    if (tg && tg.showConfirm) tg.showConfirm(t, go); else go(confirm(t));
  };
  const bal = el('p', 'pm-act', `Balans: ${ME.balance === null ? '∞' : fmt(ME.balance)} Stars`);
  root.append(btn, bal); paint(); openSheet(root);
}

async function openStatus() {
  clearSheet();
  const prem = isPrem();
  const root = el('div', 'sb pm');
  root.innerHTML = `<h3>Emoji status</h3><p>${prem ? 'Ism yoningizda ko‘rinadigan animatsion status.' : 'Emoji-status faqat Premium uchun.'}</p><div class="stp-g"></div><div class="stp-n"></div>`;
  const grid = root.querySelector('.stp-g'), note = root.querySelector('.stp-n');
  let list = []; try { list = await statusList(); } catch (e) {}
  const nameOf = (id) => (id ? (list[id - 1] && list[id - 1].n) || '' : 'Status yo‘q');
  const paintSel = () => { [...grid.children].forEach((b) => b.classList.toggle('on', Number(b.dataset.id) === (ME.status || 0))); note.textContent = ME.status ? nameOf(ME.status) : ''; };
  const cell = (id) => {
    const b = el('button', 'stp-c' + (!prem && id ? ' lock' : '')); b.type = 'button'; b.dataset.id = id;
    if (id) b.appendChild(statusLive(id, 40)); else b.appendChild(el('span', 'stp-x', '✕'));
    if (!prem && id) b.appendChild(el('i', 'stp-lk', LOCK_SVG));
    b.onclick = async () => {
      if (id && !prem) { haptic('medium'); closeSheet(); toast('Emoji-status faqat Premium uchun'); setTimeout(openPremium, 300); return; }
      if (b.disabled) return; b.disabled = true;
      try { const r = await call('status', { id }); ME.status = r.status; haptic('light'); paintSel(); note.textContent = id ? nameOf(id) : 'Status olib tashlandi'; if (TAB === 'mine') renderView(); }
      catch (e) { toast(aerr(e)); }
      b.disabled = false;
    };
    return b;
  };
  grid.appendChild(cell(0)); list.forEach((_, i) => grid.appendChild(cell(i + 1)));
  if (!prem) { const go = el('button', 'btn', `Premium olish`); go.onclick = openPremium; root.appendChild(go); }
  paintSel(); openSheet(root);
}
$('#btn-bal').onclick = () => { haptic('light'); openBuyStars(); };
function setTab(t) { TAB = t; renderView(); window.scrollTo(0, 0); }
document.querySelectorAll('#nav [data-tab]').forEach((b) => { b.onclick = () => { haptic('light'); setTab(b.dataset.tab); }; });
$('#me-btn').onclick = () => { haptic('light'); setTab('mine'); };
(function mkAvatar() {
  const box = $('#me-av'); const nm = TU.first_name || TU.username || '?';
  if (TU.photo_url) { const im = new Image(); im.src = TU.photo_url; im.alt = ''; im.onerror = () => { box.textContent = nm[0].toUpperCase(); box.className = 'ltr'; }; box.append(im); }
  else { box.textContent = nm[0].toUpperCase(); box.className = 'ltr'; }
})();


// ---------- Majburiy obuna
function subGate(info) {
  return new Promise((resolve) => {
    const g = el('div', 'gate', `<div class="gi"><svg viewBox="0 0 24 24" width="46" height="46" fill="#fff"><path d="M20.600 4.200L3.400 10.900c-.9.400-.9 1.100-.2 1.300l4.400 1.400 1.700 5.300c.2.600.4.800.9.800.4 0 .6-.2.9-.5l2.100-2 4.400 3.300c.8.500 1.400.2 1.600-.8l2.900-13.600c.3-1.200-.4-1.700-1.500-1.100z"/></svg></div><h2>Kanalga obuna bo‘ling</h2><p>Ilovadan foydalanish uchun rasmiy kanalimizga obuna bo‘lishingiz kerak.</p>`);
    const go = el('button', 'btn', 'Kanalga o‘tish');
    go.onclick = () => { try { tg.openTelegramLink(info.url); } catch (e) { window.open(info.url, '_blank'); } };
    const ck = el('button', 'btn sec', 'Obunani tekshirish');
    ck.onclick = async () => {
      ck.disabled = true;
      try { const r = await call('sub'); if (r.ok) { g.remove(); resolve(); return; } haptic('medium'); toast('Hali obuna bo‘lmagansiz'); }
      catch (e) { toast(aerr(e)); }
      ck.disabled = false;
    };
    g.append(go, ck); document.body.appendChild(g);
  });
}

(async function boot() {
  const view = $('#view');
  if (!tg || !tg.Serverless) { view.appendChild(el('div', 'empty', 'Bu sahifani Telegram ichida oching.')); return; }
  try {
    const subP = call('sub').catch(() => ({ ok: true }));      // uchalasi bir vaqtda ketadi (ketma-ket emas)
    const dataP = Promise.all([catalog(), call('me')]);
    dataP.catch(() => {});
    const sb = await subP;
    if (!sb.ok) await subGate(sb);
    [CAT, ME] = await dataP;
    setServerLite(!!(ME && ME.lite)); setVip(!!(ME && ME.vip));
  } catch (e) {
    view.appendChild(el('div', 'empty', `Yuklanmadi: ${aerr(e)}<br><br><button class="btn" id="retry">Qayta urinish</button>`));
    $('#retry').onclick = () => location.reload();
    return;
  }
  CHAT = initChat({ call, tg, toast, haptic, el, errText, myId: TU.id, myName: [TU.first_name, TU.last_name].filter(Boolean).join(' ') || TU.username || 'Men', myPhoto: TU.photo_url || (ME && ME.photo) || '',
    app: {
      me: () => ME, cat: () => CAT, models: (k) => MODELS(k), gname: (g) => COL(g.k).name, visual, fmt, reload, profile: (id) => openProfile(id), anim: () => SET.anim,
      tile: (g, i, reg, fn) => tileEl(g, i, reg, fn),
      buy: () => openBuy(), upgrade: (g) => openUpgrade(g),
      // Chatdagi sovg'a kartasidan "Ko'rish": sovg'a menda bo'lsa to'liq oyna, bo'lmasa egasi bilan
      showGift: async (g) => {
        const mine = ME.gifts.find((m) => m.id === g.id);
        if (mine) return showUnique(mine);                  // menda bo'lsa — darhol (tarmoqsiz)
        try {
          const r = await call('gift', { id: g.id });       // yo'q bo'lsa — to'liq ma'lumot va hozirgi egasi
          if (r.owner.id === TU.id) { await reload(); return showUnique(ME.gifts.find((m) => m.id === g.id) || r.gift); }
          showUnique(r.gift, { owner: r.owner });
        } catch (e) { toast(e && e.code === 'NOT_FOUND' ? 'Bu sovg‘a o‘chirilgan' : aerr(e)); }
      },
    } });
  document.addEventListener('chat-closed', () => { if (TAB === 'chat') renderView(); else CHAT.pollUnread(); });
  applyTheme(); preload(); refresh(); CHAT.pollUnread();
})();
