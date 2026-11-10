import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import * as dbops from 'sdk/db';
import { users, settings, gifts, payments } from '../schema.js';
import { ADMIN_IDS, START_STARS, CHANNEL, CHANNEL_URL, BONUS_STARS, BONUS_KEY, WEBAPP_URL } from './config.js';

export const isAdmin = (id) => ADMIN_IDS.includes(Number(id));

// vaznli tasodifiy indeks
export function pickW(w) {
  let t = 0;
  for (const x of w) t += x;
  let r = Math.random() * t;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
  return w.length - 1;
}

// Bir martalik bonus. Belgi (marker) `payments` jadvaliga yoziladi: id = "<BONUS_KEY>:<user>" — shuning uchun ikki marta berilmaydi.
const _bonusDone = new Set();
async function grantBonus(row, isNew) {
  if (!BONUS_STARS || !row || isAdmin(row.id)) return;
  const key = BONUS_KEY + ':' + row.id;
  if (_bonusDone.has(key)) return;
  try {
    await db.insert(payments).values({ id: key, user: row.id, tg: 0, stars: BONUS_STARS, created: new Date().toISOString() }).run();
  } catch (e) {
    let ex = null;
    try { ex = await db.select().from(payments).where(eq(payments.id, key)).get(); } catch (e2) {}
    if (ex) _bonusDone.add(key);   // allaqachon berilgan
    return;                        // aks holda keyingi so'rovda qayta uriniladi
  }
  _bonusDone.add(key);
  const balance = (row.balance || 0) + BONUS_STARS;
  await db.update(users).set({ balance }).where(eq(users.id, row.id)).run();
  row.balance = balance;
  if (!isNew) {
    const f = (BONUS_STARS + '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    try {
      Promise.resolve(api.sendMessage({ chat_id: row.id, text: `🎁 Sizga ${f} ⭐ bonus berildi! Balansingizga qo‘shildi.`, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined })).catch(() => {});
    } catch (e) {}
  }
}

export async function ensureUser(u) {
  let row = await db.select().from(users).where(eq(users.id, u.id)).get();
  if (row) {
    if (u.photo_url && row.photo !== u.photo_url) { try { await db.update(users).set({ photo: u.photo_url }).where(eq(users.id, u.id)).run(); row.photo = u.photo_url; } catch (e) {} }
    await grantBonus(row, false);
    return row;
  }
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
  row = { id: u.id, name, username: u.username || '', balance: START_STARS, created: new Date().toISOString(), photo: u.photo_url || '' };
  try { await db.insert(users).values(row).run(); }
  catch (e) { row = await db.select().from(users).where(eq(users.id, u.id)).get(); }
  await grantBonus(row, true);
  return row;
}

export function assertFunds(user, price) {
  if (isAdmin(user.id)) return;
  if (user.balance < price) throw new EndpointError('Yetarli Stars yoq', { code: 'NO_STARS' });
}

export async function addStars(user, delta) {
  if (isAdmin(user.id)) return null;
  const balance = user.balance + delta;
  await db.update(users).set({ balance }).where(eq(users.id, user.id)).run();
  user.balance = balance;
  return balance;
}

export const pub = (g) => ({ id: g.id, k: g.kind || 0, no: g.num || 0, up: g.upgraded ? 1 : 0, m: g.model, p: g.pattern, b: g.backdrop, n: g.pinned || 0, s: g.price || 0, h: g.hidden || 0, d: g.created || '' });
export const balanceOf = (user) => (isAdmin(user.id) ? null : user.balance);

// @username yoki ID bo'yicha topish (ilovaga kirgan bo'lishi kerak)
export async function findUser(who) {
  const t = String(who || '').trim().replace(/^@/, '');
  if (!t) return null;
  if (/^\d+$/.test(t)) { const r = await db.select().from(users).where(eq(users.id, Number(t))).get(); if (r) return r; }
  const all = await db.select().from(users).all();
  return all.find((x) => (x.username || '').toLowerCase() === t.toLowerCase()) || null;
}

// ---------- Majburiy obuna (kanal /admin orqali bazaga saqlanadi; config.js — zaxira)
export const R = (x) => (x && x.result !== undefined ? x.result : x);
export async function getChannel() {
  const row = await db.select().from(settings).where(eq(settings.id, 1)).get();
  if (row && row.channel) return { channel: row.channel, url: row.url || '', title: row.title || '' };
  if (CHANNEL) return { channel: CHANNEL, url: CHANNEL_URL || 'https://t.me/' + String(CHANNEL).replace(/^@/, ''), title: String(CHANNEL) };
  return null;
}
export async function isSub(id) {
  const c = await getChannel();
  if (!c || isAdmin(id)) return true;
  try {
    const m = R(await api.getChatMember({ chat_id: c.channel, user_id: Number(id) }));
    return ['member', 'administrator', 'creator'].includes(m.status) || (m.status === 'restricted' && m.is_member === true);
  } catch (e) { return true; } // bot kanalda admin bo'lmasa — hamma bloklanib qolmasin
}
export async function requireSub(user) {
  if (!(await isSub(user.id))) throw new EndpointError('Avval kanalga obuna boling', { code: 'NOT_SUB' });
}


// ---------- Yaxshilash raqami (#N): sovg'a qachon sotib olingani emas, QACHON YAXSHILANGANIGA qarab beriladi.
// Raqam — band bo'lmagan eng kichik musbat son. O'chirilgan sovg'aning raqami bo'shaydi (supplydan ayriladi),
// shuning uchun raqam hech qachon SUPPLY dan oshmaydi.
export function freeNum(rows, kind = 0) {
  const used = new Set(rows.filter((g) => g.upgraded && g.num && (g.kind || 0) === kind).map((g) => g.num));
  let n = 1; while (used.has(n)) n++;
  return n;
}
// Bir vaqtda kelgan so'rovlarni navbatga qo'yadi (bir instansiya ichida): balans va raqamlar poygasini oldini oladi.
let _chain = Promise.resolve();
export const lock = (fn) => { const run = _chain.then(() => fn()); _chain = run.catch(() => {}); return run; };

// Butun sovg'alar jadvalini SAHIFALAB (1500 tadan) o'qiydi. Katta jadvalda bitta `.all()` so'rovi serverda HTTP 500 beradi.
// sdk/db da gt/asc bo'lmasa — eski usul (.all()) ishlatiladi.
export async function allGifts(max = 400000) {
  const { gt, asc } = dbops;
  if (!(gt && asc)) return db.select().from(gifts).all();
  const out = []; let last = 0;
  for (;;) {
    const rows = await db.select().from(gifts).where(gt(gifts.id, last)).orderBy(asc(gifts.id)).limit(1500).all();
    if (!rows.length) break;
    for (const r of rows) out.push(r);
    last = rows[rows.length - 1].id;
    if (rows.length < 1500 || out.length >= max) break;
  }
  return out;
}

// Raqamsiz yoki takrorlangan (bir xil raqam ikki sovg'ada) yaxshilangan sovg'alarni tuzatadi.
// Raqamsiz sovg'a ilovada "#id" (masalan #1300) bo'lib ko'rinib qolmasligi uchun har so'rovda tekshiriladi.
let _lastFix = 0;
export async function ensureNums(force = false) {
  if (!force && Date.now() - _lastFix < 21600000) return;   // butun jadvalni skanerlaydi — 10 daqiqada bir marta
  _lastFix = Date.now();
  try {
    const rows = await allGifts();
    const used = {}, fix = [];
    for (const g of rows.filter((x) => x.upgraded).sort((a, b) => a.id - b.id)) {
      const k = g.kind || 0, s = used[k] || (used[k] = new Set());
      if (!g.num || s.has(g.num)) fix.push(g); else s.add(g.num);
    }
    // Bir so'rovda ko'pi bilan 300 ta tuzatiladi (so'rov vaqt limitidan oshib ketmasligi uchun), qolgani keyingi so'rovda.
    const ptr = {};
    const jobs = fix.slice(0, 300).map((g) => {
      const k = g.kind || 0, s = used[k] || (used[k] = new Set());
      let n = ptr[k] || 1; while (s.has(n)) n++; s.add(n); ptr[k] = n + 1;
      return { id: g.id, n };
    });
    for (let i = 0; i < jobs.length; i += 10) {
      await Promise.allSettled(jobs.slice(i, i + 10).map((j) => db.update(gifts).set({ num: j.n }).where(eq(gifts.id, j.id)).run()));
    }
    if (fix.length > jobs.length) _lastFix = 0;           // hali tuzatilmagani bor: keyingi so'rovda davom etadi
  } catch (e) { console.error('ensureNums xato', e && e.message); }
}

// Kolleksiya statistikasi (sotilgan/yaxshilangan/birinchi-oxirgi sotuv) — butun jadvalni har so'rovda o'qimaslik uchun qisqa keshda
export const statsCache = { t: 0, v: null };

// Kolleksiyalar bo'yicha HAQIQIY son — bazadan (sahifalab) sanaladi. Ro'yxatdagi "sotilgan" va xaridni tekshirish BIR XIL shu hisobdan foydalanadi,
// shuning uchun "56 qoldi", lekin "Hammasi sotilgan" degan nomuvofiqlik bo'lmaydi.
const _kc = { t: 0, v: null };
export async function kindCounts(force = false) {
  if (!force && _kc.v && Date.now() - _kc.t < 5000) return _kc.v;
  const v = {};
  for (const g of await allGifts()) { const k = g.kind || 0; v[k] = (v[k] || 0) + 1; }
  _kc.v = v; _kc.t = Date.now();
  return v;
}
export const bustCounts = () => { _kc.t = 0; };

// ---------- Kolleksiya holati (xotirada): soni, yaxshilangani, band raqamlar, birinchi/oxirgi sana.
// Bazadan har kolleksiya BIR marta o'qiladi (1 soatda bir marta qayta tekshiriladi), keyin xarid/upgrade/craft/o'chirish uni o'zi yangilaydi.
// Shunda har so'rovda butun jadval o'qilmaydi (bazaning "rows_read" limiti tugamaydi).
const _ks = {};
export async function kindState(kind) {
  const s0 = _ks[kind];
  if (s0 && Date.now() - s0.t < 3600000) return s0;
  const s = { t: Date.now(), count: 0, issued: 0, first: 0, last: 0, used: new Set() };
  const { and, gt, asc } = dbops;
  const eat = (r) => {
    s.count++;
    if (r.upgraded) { s.issued++; if (r.num) s.used.add(r.num); }
    const t = Date.parse(r.created); if (!isNaN(t)) { if (!s.first || t < s.first) s.first = t; if (t > s.last) s.last = t; }
  };
  if (and && gt && asc) {
    let last = 0;
    for (;;) {
      const rows = await db.select().from(gifts).where(and(eq(gifts.kind, kind), gt(gifts.id, last))).orderBy(asc(gifts.id)).limit(1500).all();
      if (!rows.length) break;
      for (const r of rows) eat(r);
      last = rows[rows.length - 1].id;
      if (rows.length < 1500) break;
    }
  } else for (const r of await db.select().from(gifts).where(eq(gifts.kind, kind)).all()) eat(r);
  _ks[kind] = s;
  return s;
}
export const ksAdd = (kind, r) => {
  const s = _ks[kind]; if (!s) return;
  s.count++;
  if (r.upgraded) { s.issued++; if (r.num) s.used.add(r.num); }
  const t = Date.parse(r.created); if (!isNaN(t)) { if (!s.first || t < s.first) s.first = t; if (t > s.last) s.last = t; }
};
export const ksUp = (kind, num) => { const s = _ks[kind]; if (!s) return; s.issued++; if (num) s.used.add(num); };
export const ksDel = (kind, g) => { const s = _ks[kind]; if (!s) return; s.count = Math.max(0, s.count - 1); if (g.upgraded) { s.issued = Math.max(0, s.issued - 1); if (g.num) s.used.delete(g.num); } };
export const ksReset = () => { for (const k of Object.keys(_ks)) delete _ks[k]; };
export const nextNum = (s) => { let n = 1; while (s.used.has(n)) n++; return n; };
export const bumpAll = () => { ksReset(); _kc.t = 0; statsCache.t = 0; };

// Eng katta sovg'a ID si (butun jadvalni o'qimasdan)
export async function maxGiftId() {
  const { desc } = dbops;
  if (desc) { const r = await db.select().from(gifts).orderBy(desc(gifts.id)).limit(1).all(); return r.length ? r[0].id : 0; }
  return (await allGifts()).reduce((m, g) => Math.max(m, g.id), 0);
}
// Bozor ro'yxati keshi (list/mbuy/send uni tozalaydi) va foydalanuvchi ismlari keshi
export const mkc = { t: 0, v: null };
let _nm = { t: 0, v: {} };
export async function userNames() {
  if (Date.now() - _nm.t > 300000) { const v = {}; for (const r of await db.select().from(users).all()) v[r.id] = r.name; _nm = { t: Date.now(), v }; }
  return _nm.v;
}
export const bumpStats = () => { statsCache.t = Math.min(statsCache.t, Date.now() - 3000); };   // 5 soniyadan keyin yangilanadi (har so'rovda emas)
