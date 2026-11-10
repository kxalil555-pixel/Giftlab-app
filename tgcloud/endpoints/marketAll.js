import { allGifts, mkc } from '../lib/game.js';
import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts, users } from '../schema.js';
import { WEBAPP_URL, MARKET_CUT, colOf } from '../lib/config.js';
import { isAdmin, findUser, addStars, lock, bumpStats } from '../lib/game.js';
import { ensureChatUser, roomKey, insertMessage, prune, touchDialog, GIFT_TAG } from '../lib/chat.js';

// Faqat admin: bozordagi (sotuvga qo'yilgan) HAMMA sovg'ani sotib olish.
//  { op:'list' }                              -> { items:[{id,price}], total }  (adminning o'z sovg'alari kirmaydi)
//  { op:'buy', items:[{id, to?}] }            -> har bir sovg'a sotib olinadi; `to` bo'lmasa adminning o'ziga, bo'lsa o'sha foydalanuvchiga beriladi
// Sotuvchilarga odatdagidek narxning MARKET_CUT ulushi Stars bo'lib to'lanadi va xabar boradi. Admin Stars'i cheksiz.
const MAX_ITEMS = 30;
const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); return true; } catch (e) { return false; }
};
const f = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

async function work(input, u) {
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, MAX_ITEMS);
  if (!items.length) throw new EndpointError('Bo‘sh', { code: 'BAD' });
  const meChat = await ensureChatUser(u);
  const rows = new Map();                       // egasi -> yangi olgan sovg'alar
  const sellers = new Map();                    // sotuvchi -> { n, got }
  let bought = 0, gone = 0, spent = 0;
  const recvCache = new Map();
  for (const it of items) {
    const g = await db.select().from(gifts).where(eq(gifts.id, Number(it.id))).get();
    if (!g || !g.price || !g.upgraded || g.owner === u.id) { gone++; continue; }   // allaqachon sotilgan / sotuvdan olingan
    let to = null;
    if (it.to) {
      to = recvCache.get(Number(it.to)) || await findUser(String(it.to));
      if (!to || isAdmin(to.id)) to = null; else recvCache.set(to.id, to);
    }
    const owner = to ? to.id : u.id;
    const seller = await db.select().from(users).where(eq(users.id, g.owner)).get();
    await db.update(gifts).set({ owner, price: 0, pinned: 0 }).where(eq(gifts.id, g.id)).run(); mkc.t = 0;
    if (seller) {
      if (seller.wear === g.id) await db.update(users).set({ wear: 0 }).where(eq(users.id, seller.id)).run();
      const got = Math.floor(g.price * MARKET_CUT);
      await addStars(seller, got);
      const s = sellers.get(seller.id) || { n: 0, got: 0 }; s.n++; s.got += got; sellers.set(seller.id, s);
    }
    bought++; spent += g.price;
    if (to) { const a = rows.get(to.id) || { to, list: [] }; a.list.push(g); rows.set(to.id, a); }
  }
  // chat kartalari (admin -> qabul qiluvchi)
  const msgs = [];
  for (const { to, list } of rows.values()) {
    try {
      await ensureChatUser({ id: to.id, first_name: to.name, username: to.username || '' });
      const room = roomKey(u.id, to.id);
      let m = null;
      for (const g of list.slice(0, 60)) m = await insertMessage({ room, sender: u.id, name: meChat.name, body: `${GIFT_TAG}${g.id},${g.backdrop},${g.pattern},${g.model},${g.num || 0},${g.kind || 0}⟧`, ts: Date.now() });
      if (m) { await prune(room); await touchDialog(u.id, to.id, m); }
    } catch (e) {}
    const lines = list.slice(0, 12).map((g) => `• ${colOf(g.kind).name} #${g.num || g.id}`);
    if (list.length > 12) lines.push(`…va yana ${list.length - 12} ta`);
    msgs.push({ id: to.id, text: `🎁 Sizga ${list.length} ta sovg'a qilindi!\n${lines.join('\n')}` });
  }
  for (const [id, s] of sellers) msgs.push({ id, text: `💰 ${s.n} ta sovg'angiz sotildi: +${f(s.got)} Stars` });
  bumpStats();
  return { msgs, bought, gone, spent };
}

async function main(input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });
  if (input.op === 'list') {
    const all = (await allGifts()).filter((g) => g.price > 0 && g.upgraded && g.owner !== u.id);
    return { items: all.map((g) => ({ id: g.id, price: g.price })), total: all.reduce((s, g) => s + g.price, 0) };
  }
  if (input.op !== 'buy') throw new EndpointError('Notogri amal', { code: 'BAD' });
  const r = await lock(() => work(input, u));
  for (let i = 0; i < r.msgs.length; i += 25) {
    await Promise.all(r.msgs.slice(i, i + 25).map((m) => notify(m.id, m.text)));
    if (i + 25 < r.msgs.length) await new Promise((x) => setTimeout(x, 1000));
  }
  return { ok: 1, bought: r.bought, gone: r.gone, spent: r.spent };
}

async function __h(input, ctx) {
  try { return await main(input, ctx); } catch (e) {
    if (e instanceof EndpointError) throw e;
    console.error('marketAll xato', e && e.stack || e);
    throw new EndpointError('Xato: ' + String((e && e.message) || e).slice(0, 160), { code: 'ERR' });
  }
}

// Diagnostika: serverdagi haqiqiy xato matni ilovada ko'rinadi (log yo'q bo'lgani uchun)
export default async function (input, ctx) {
  try { return await __h(input, ctx); }
  catch (e) {
    if (e && e.code && e.name === 'EndpointError') throw e;
    console.error('marketAll.js xato', e && e.stack || e);
    throw new EndpointError('[marketAll] ' + String((e && e.message) || e).slice(0, 180), { code: 'SERVER' });
  }
}
