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
// Bozorga qo'yish (price>=MIN_PRICE) yoki olib tashlash (price=0)
import { requireSub, mkc } from '../lib/game.js';
export default async function (input, ctx) {
  const u = ctx.initData.user; const user = await ensureUser(u);
  await requireSub(user);
  const g = await getGift(input.id);
  if (!g || g.owner !== u.id) throw nf();
  const price = Math.floor(Number(input.price) || 0);
  if (price === 0) { await db.update(gifts).set({ price: 0 }).where(eq(gifts.id, g.id)).run(); mkc.t = 0; return { ok: 1 }; }
  if (!g.upgraded) throw new EndpointError('Faqat yaxshilangan sovgani sotish mumkin', { code: 'NOT_UP' });
  if (price < MIN_PRICE || price > 10000000) throw new EndpointError(`Narx ${MIN_PRICE} dan kam bolmasin`, { code: 'PRICE' });
  await db.update(gifts).set({ price, pinned: 0 }).where(eq(gifts.id, g.id)).run(); mkc.t = 0;
  if (user.wear === g.id) await db.update(users).set({ wear: 0 }).where(eq(users.id, u.id)).run();
  return { ok: 1 };
}
