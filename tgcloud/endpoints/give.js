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
// Faqat admin: foydalanuvchiga Stars berish
export default async function (input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });
  const to = await findUser(input.to);
  if (!to) throw new EndpointError('Foydalanuvchi topilmadi (u ilovaga kirgan bolishi kerak)', { code: 'NO_USER' });
  const amount = Math.floor(Number(input.amount) || 0);
  if (amount <= 0 || amount > 1000000000) throw new EndpointError('Notogri miqdor', { code: 'BAD' });
  await addStars(to, amount);
  notify(to.id, `⭐ Sizga ${amount} Stars berildi!`);
  return { name: to.name, id: to.id, amount };
}
