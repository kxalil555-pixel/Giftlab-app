import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { chatUsers } from '../schema.js';
import { CHAT_MAX_LEN, CHAT_GAP_MS } from '../lib/config.js';
import { isAdmin } from '../lib/game.js';
import { perkMap, perkOf, photoMap } from '../lib/perks.js';
import { ensureChatUser, roomKey, insertMessage, prune, touchDialog, pubMsg, GIFT_TAG } from '../lib/chat.js';

const BAD = /[\u0000-\u0008\u000b\u000c\u000e-\u001f​-‏‪-‮⁦-⁩]/g;
const LINK = /(https?:\/\/|www\.|t\.me\/|tg:\/\/|telegram\.me|\b[a-z0-9-]+\.(com|ru|uz|org|net|io|me|ly|xyz|app|link)\b)/i;

export default async function (input, ctx) {
  const u = ctx.initData.user;
  const me = await ensureChatUser(u);
  const admin = isAdmin(u.id);
  if (me.banned) throw new EndpointError('Siz bloklangansiz', { code: 'BANNED' });

  const text = String(input.text == null ? '' : input.text).replace(/\r/g, '').replace(BAD, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) throw new EndpointError('Bo‘sh xabar', { code: 'EMPTY' });
  if (text.includes(GIFT_TAG) || text.includes('⟧')) throw new EndpointError('Bo‘sh xabar', { code: 'EMPTY' });
  if (text.length > CHAT_MAX_LEN) throw new EndpointError('Xabar juda uzun', { code: 'LONG' });
  if (!admin && LINK.test(text)) throw new EndpointError('Havola yuborish mumkin emas', { code: 'LINKS' });

  const now = Date.now();
  if (!admin && now - (me.lastTs || 0) < CHAT_GAP_MS) throw new EndpointError('Sekinroq yozing', { code: 'RATE' });
  if (!admin && me.lastBody === text && now - (me.lastTs || 0) < 15000) throw new EndpointError('Xuddi shu xabar', { code: 'DUP' });

  const peer = Number(input.peer || 0);
  if (peer) {
    if (peer === u.id) throw new EndpointError('O‘zingizga yozib bo‘lmaydi', { code: 'SELF' });
    const pu = await db.select().from(chatUsers).where(eq(chatUsers.id, peer)).get();
    if (!pu) throw new EndpointError('Foydalanuvchi topilmadi', { code: 'NOT_FOUND' });
  }
  const room = peer ? roomKey(u.id, peer) : 'g';
  const msg = await insertMessage({ room, sender: u.id, name: me.name, body: text, ts: now });
  await db.update(chatUsers).set({ lastTs: now, lastBody: text }).where(eq(chatUsers.id, u.id)).run();
  await prune(room);
  if (peer) await touchDialog(u.id, peer, msg);
  const [pk, ph] = await Promise.all([perkMap([u.id]), photoMap([u.id])]);
  return { msg: { ...pubMsg(msg), photo: ph[u.id] || '', ...perkOf(pk, u.id) } };
}
