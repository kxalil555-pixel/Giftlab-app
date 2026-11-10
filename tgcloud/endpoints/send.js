import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts, users } from '../schema.js';
import { WEBAPP_URL, MIN_PRICE, MARKET_CUT } from '../lib/config.js';
import { ensureUser, assertFunds, addStars, findUser, isAdmin, pub, balanceOf } from '../lib/game.js';
import { ensureChatUser, roomKey, insertMessage, prune, touchDialog, pubMsg, GIFT_TAG } from '../lib/chat.js';
const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); } catch (e) {}
};
const getGift = async (id) => db.select().from(gifts).where(eq(gifts.id, Number(id))).get();
const nf = () => new EndpointError('Sovga topilmadi', { code: 'NOT_FOUND' });
import { requireSub, mkc } from '../lib/game.js';
export default async function (input, ctx) {
  const u = ctx.initData.user; const user = await ensureUser(u);
  await requireSub(user);
  const g = await getGift(input.id);
  if (!g || g.owner !== u.id) throw nf();
  const to = await findUser(input.to);
  if (!to) throw new EndpointError('Foydalanuvchi topilmadi (u ilovaga kirgan bolishi kerak)', { code: 'NO_USER' });
  if (to.id === u.id) throw new EndpointError('Ozingizga yubora olmaysiz', { code: 'SELF' });
  await db.update(gifts).set({ owner: to.id, price: 0, pinned: 0 }).where(eq(gifts.id, g.id)).run(); mkc.t = 0;
  if (user.wear === g.id) await db.update(users).set({ wear: 0 }).where(eq(users.id, u.id)).run();
  notify(to.id, `🎁 ${user.name} sizga sovg'a yubordi ${g.num ? '(#' + g.num + ')' : ''}!`);
  // Chatdan yuborilgan bo'lsa: yozishmaga sovg'a kartasi xabarini qo'shamiz (muvaffaqiyatsiz bo'lsa ham sovg'a o'tgan)
  if (g.upgraded) {
    try {
      const me = await ensureChatUser(u);
      const room = roomKey(u.id, to.id);
      const body = `${GIFT_TAG}${g.id},${g.backdrop},${g.pattern},${g.model},${g.num || 0},${g.kind || 0}⟧`;
      const msg = await insertMessage({ room, sender: u.id, name: me.name, body, ts: Date.now() });
      await prune(room);
      await touchDialog(u.id, to.id, msg);
      return { ok: 1, to: to.name, msg: pubMsg(msg) };
    } catch (e) {}
  }
  return { ok: 1, to: to.name };
}
