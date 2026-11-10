import { db } from 'sdk';
import { eq } from 'sdk/db';
import { dialogs } from '../schema.js';
import { CHAT_LIST } from '../lib/config.js';
import { isAdmin } from '../lib/game.js';
import { ensureChatUser, roomKey, recent, pubMsg, findDialog } from '../lib/chat.js';
import { perkMap, perkOf, photoMap } from '../lib/perks.js';

// Xonadagi xabarlar. since=0 bo'lsa oxirgi CHAT_LIST ta; aks holda faqat yangilari.
// live — oynadagi mavjud id lar (admin o'chirgan xabarlarni mijoz olib tashlashi uchun).
export default async function (input, ctx) {
  const u = ctx.initData.user;
  const me = await ensureChatUser(u);
  const peer = Number(input.peer || 0);
  const since = Number(input.since || 0);
  const room = peer ? roomKey(u.id, peer) : 'g';
  const rows = (await recent(room, CHAT_LIST)).sort((x, y) => x.id - y.id);
  const fresh = rows.filter((m) => m.id > since);
  if (peer && rows.length) {
    const d = await findDialog(u.id, peer);
    if (d) {
      const top = rows[rows.length - 1].id;
      const set = u.id === d.a ? { readA: top } : { readB: top };
      await db.update(dialogs).set(set).where(eq(dialogs.id, d.id)).run();
    }
  }
  // yuboruvchilarning rasmi / Premium belgisi / statusi (faqat yangi xabarlar uchun)
  const sid = [...new Set(fresh.map((m) => m.sender))];
  const [pk, ph] = sid.length ? await Promise.all([perkMap(sid), photoMap(sid)]) : [{}, {}];
  const msgs = fresh.map((m) => { const p = perkOf(pk, m.sender); return { ...pubMsg(m), photo: ph[m.sender] || '', prem: p.prem, st: p.st }; });
  return { msgs, live: rows.map((m) => m.id), admin: isAdmin(u.id), banned: !!me.banned };
}
