import { allGifts, mkc, userNames } from '../lib/game.js';
import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import * as dbops from 'sdk/db';
import { gifts, users } from '../schema.js';
import { WEBAPP_URL, MIN_PRICE, MARKET_CUT } from '../lib/config.js';
import { ensureUser, assertFunds, addStars, findUser, isAdmin, pub, balanceOf, ensureNums } from '../lib/game.js';
const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); } catch (e) {}
};
const getGift = async (id) => db.select().from(gifts).where(eq(gifts.id, Number(id))).get();
const nf = () => new EndpointError('Sovga topilmadi', { code: 'NOT_FOUND' });
const _mk0 = null;   // bozor ro'yxati qisqa keshda (har so'rovda butun jadval o'qilmasin)
async function __h(input, ctx) {
  await ensureUser(ctx.initData.user);
  await ensureNums();
  if (!mkc.v || Date.now() - mkc.t > 60000) { const { and, gt } = dbops; mkc.v = (gt && and) ? await db.select().from(gifts).where(and(gt(gifts.price, 0), eq(gifts.upgraded, 1))).all() : (await allGifts()).filter((g) => g.price > 0 && g.upgraded); mkc.t = Date.now(); }
  const all = mkc.v.slice();
  const names = await userNames();
  all.sort((a, b) => a.price - b.price || b.id - a.id);
  return { items: all.slice(0, 500).map((g) => ({ ...pub(g), o: g.owner, on: names[g.owner] || 'Foydalanuvchi' })) };
}

// Diagnostika: serverdagi haqiqiy xato matni ilovada ko'rinadi (log yo'q bo'lgani uchun)
export default async function (input, ctx) {
  try { return await __h(input, ctx); }
  catch (e) {
    if (e && e.code && e.name === 'EndpointError') throw e;
    console.error('market.js xato', e && e.stack || e);
    throw new EndpointError('[market] ' + String((e && e.message) || e).slice(0, 180), { code: 'SERVER' });
  }
}
