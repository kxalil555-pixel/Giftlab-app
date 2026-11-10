import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts, users } from '../schema.js';
import { WEBAPP_URL, MIN_PRICE, MARKET_CUT } from '../lib/config.js';
import { ensureUser, assertFunds, addStars, findUser, isAdmin, pub, balanceOf } from '../lib/game.js';
const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); } catch (e) {}
};
const getGift = async (id) => db.select().from(gifts).where(eq(gifts.id, Number(id))).get();
const nf = () => new EndpointError('Sovga topilmadi', { code: 'NOT_FOUND' });
export default async function (input, ctx) {
  const u = ctx.initData.user; const user = await ensureUser(u);
  const g = await getGift(input.id);
  if (!g || g.owner !== u.id) throw nf();
  if (input.op === 'pin') {
    await db.update(gifts).set({ pinned: g.pinned ? 0 : 1 }).where(eq(gifts.id, g.id)).run(); return { ok: 1 };
  }
  if (input.op === 'hide') {
    await db.update(gifts).set({ hidden: g.hidden ? 0 : 1 }).where(eq(gifts.id, g.id)).run(); return { ok: 1 };
  }
  if (input.op === 'wear') {
    if (!g.upgraded) throw new EndpointError('Avval yaxshilang', { code: 'NOT_UP' });
    await db.update(users).set({ wear: user.wear === g.id ? 0 : g.id }).where(eq(users.id, u.id)).run(); return { ok: 1 };
  }
  throw new EndpointError('Notogri amal', { code: 'BAD' });
}
