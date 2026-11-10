import { allGifts } from '../lib/game.js';
import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts } from '../schema.js';
import { WEBAPP_URL } from '../lib/config.js';
import { PATTERN_W, BACKDROP_W, EXTRA_BD, modelW } from '../lib/data.js';
import { isAdmin, pickW, lock, bumpAll } from '../lib/game.js';

// Faqat admin: tanlangan foydalanuvchilarning (yoki hamma foydalanuvchining) YAXSHILANMAGAN sovg'alarini bittada yaxshilash. Stars olinmaydi.
//  { op:'count', ids:[...] }         -> { total, users }        (ids bo'sh = hamma foydalanuvchi, adminsiz)
//  { op:'run',   ids:[...] }         -> { done, failed, left, per:{owner:n} }   (bir so'rovda ≤ MAX_CALL ta; left > 0 bo'lsa mijoz qayta chaqiradi)
//  { op:'notify', items:[{id,n}] }   -> botdan "N ta sovg'angiz yaxshilandi" xabari
const MAX_CALL = 60;
const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); return true; } catch (e) { return false; }
};

const parseIds = (v) => {
  if (!Array.isArray(v) || !v.length) return null;                    // null = hamma foydalanuvchi
  const ids = [...new Set(v.map(Number))].filter((x) => Number.isInteger(x) && x > 0);
  if (!ids.length) throw new EndpointError('ID noto‘g‘ri', { code: 'BAD' });
  return new Set(ids);
};
const pendingOf = (all, set) => all.filter((g) => !g.upgraded && (set ? set.has(g.owner) : !isAdmin(g.owner))).sort((a, b) => a.id - b.id);

async function doUp(set) {
  const all = await allGifts();
  const pending = pendingOf(all, set);
  const batch = pending.slice(0, MAX_CALL);
  const used = {}, ptr = {};
  for (const g of all) if (g.upgraded && g.num) (used[g.kind || 0] || (used[g.kind || 0] = new Set())).add(g.num);
  const takeNum = (k) => { const s = used[k] || (used[k] = new Set()); let n = ptr[k] || 1; while (s.has(n)) n++; s.add(n); ptr[k] = n + 1; return n; };

  const jobs = batch.map((g) => {
    const kind = g.kind || 0;
    const bd = EXTRA_BD[kind];
    return { g, kind, model: pickW(modelW(kind)), pattern: pickW(PATTERN_W), backdrop: bd && bd.length ? bd[Math.floor(Math.random() * bd.length)] : pickW(BACKDROP_W), num: takeNum(kind) };
  });
  const per = {}; let done = 0, failed = 0;
  for (let i = 0; i < jobs.length; i += 10) {
    const part = jobs.slice(i, i + 10);
    const res = await Promise.allSettled(part.map((j) => db.update(gifts).set({ upgraded: 1, model: j.model, pattern: j.pattern, backdrop: j.backdrop, num: j.num }).where(eq(gifts.id, j.g.id)).run()));
    res.forEach((r, k) => {
      const j = part[k];
      if (r.status === 'fulfilled') { done++; per[j.g.owner] = (per[j.g.owner] || 0) + 1; }
      else { failed++; used[j.kind].delete(j.num); }
    });
  }
  bumpAll();
  return { done, failed, left: pending.length - done, per: Object.entries(per).map(([id, n]) => [Number(id), n]) };   // massiv: obyekt kaliti son bo'lsa serverdan qaytmaydi
}

async function main(input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });

  if (input.op === 'count') {
    const set = parseIds(input.ids);
    const p = pendingOf(await allGifts(), set);
    return { total: p.length, users: new Set(p.map((g) => g.owner)).size };
  }
  if (input.op === 'run') {
    const set = parseIds(input.ids);
    return lock(() => doUp(set));
  }
  if (input.op === 'notify') {
    const items = (Array.isArray(input.items) ? input.items : []).slice(0, 25).filter((x) => x && Number(x.id) > 0 && Number(x.n) > 0);
    const res = await Promise.all(items.map((x) => notify(Number(x.id), `⬆️ ${Math.floor(x.n)} ta sovg'angiz yaxshilandi (upgrade)! Ilovada ko'rishingiz mumkin.`)));
    return { sent: res.filter(Boolean).length };
  }
  throw new EndpointError('Notogri amal', { code: 'BAD' });
}

export default async function (input, ctx) {
  try { return await main(input, ctx); } catch (e) {
    if (e instanceof EndpointError) throw e;
    console.error('bulkUp xato', e && e.stack || e);
    throw new EndpointError('Xato: ' + String((e && e.message) || e).slice(0, 160), { code: 'ERR' });
  }
}
