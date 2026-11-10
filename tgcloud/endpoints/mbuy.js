import { lock } from '../lib/game.js';
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
import { requireSub, mkc } from '../lib/game.js';
async function run(input, ctx) {
  const u = ctx.initData.user; const user = await ensureUser(u);
  const g = await getGift(input.id);
  if (!g || !g.price) throw new EndpointError('Sovga sotuvda emas', { code: 'GONE' });
  if (g.owner === u.id) throw new EndpointError('Bu sizning sovgangiz', { code: 'OWN' });
  assertFunds(user, g.price);
  const seller = await db.select().from(users).where(eq(users.id, g.owner)).get();
  await db.update(gifts).set({ owner: u.id, price: 0, pinned: 0 }).where(eq(gifts.id, g.id)).run(); mkc.t = 0;
  if (seller) {
    if (seller.wear === g.id) await db.update(users).set({ wear: 0 }).where(eq(users.id, seller.id)).run();
    const got = Math.floor(g.price * MARKET_CUT);
    await addStars(seller, got);
    notify(seller.id, `💰 Sovg'angiz #${g.id} sotildi: +${got} Stars`);
  }
  await addStars(user, -g.price);
  return { balance: balanceOf(user), gift: pub({ ...g, owner: u.id, price: 0, pinned: 0 }) };
}

export default async (input, ctx) => {
  const user = await ensureUser(ctx.initData.user);
  await requireSub(user);   // Telegram API chaqiruvi navbatdan tashqarida
  return lock(() => run(input, ctx));
};
