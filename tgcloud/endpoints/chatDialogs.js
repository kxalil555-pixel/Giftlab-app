import { db } from 'sdk';
import { eq, desc } from 'sdk/db';
import { chatUsers, dialogs } from '../schema.js';
import { ensureChatUser, recent } from '../lib/chat.js';
import { ensureUser } from '../lib/game.js';
import { perkMap, perkOf, photoMap } from '../lib/perks.js';

// Chat bosh sahifasi: umumiy chat oxirgisi, shaxsiy yozishmalar, odamlar ro'yxati, o'qilmaganlar
export default async function (input, ctx) {
  const u = ctx.initData.user;
  await ensureUser(u);          // Telegram profil rasmi har safar yangilanadi
  await ensureChatUser(u);
  const mine = [...(await db.select().from(dialogs).where(eq(dialogs.a, u.id)).all()), ...(await db.select().from(dialogs).where(eq(dialogs.b, u.id)).all())];
  const out = [];
  for (const d of mine) {
    const peer = d.a === u.id ? d.b : d.a;
    const p = await db.select().from(chatUsers).where(eq(chatUsers.id, peer)).get();
    const read = d.a === u.id ? d.readA : d.readB;
    out.push({ peer, name: p ? p.name : 'Foydalanuvchi', username: p ? p.username || '' : '', last: d.lastBody || '', ts: d.lastTs, mine: d.lastFrom === u.id, seen: d.lastFrom === u.id && (d.a === u.id ? d.readB : d.readA) >= d.lastId, unread: d.lastFrom !== u.id && d.lastId > read });
  }
  out.sort((x, y) => y.ts - x.ts);
  let people = [];
  try { people = await db.select().from(chatUsers).orderBy(desc(chatUsers.lastTs)).limit(40).all(); }
  catch (e) { people = (await db.select().from(chatUsers).all()).sort((x, y) => y.lastTs - x.lastTs).slice(0, 40); }
  people = people.filter((p) => p.id !== u.id && !p.banned).map((p) => ({ id: p.id, name: p.name }));
  const g = (await recent('g', 1))[0];
  // rasm / Premium / status — bir marta, hamma ko'rinadiganlar uchun
  const ids = [...out.map((d) => d.peer), ...people.map((p) => p.id), u.id];
  const [pk, ph] = await Promise.all([perkMap(ids), photoMap(ids)]);
  for (const x of out) Object.assign(x, { photo: ph[x.peer] || '' }, perkOf(pk, x.peer));
  for (const x of people) Object.assign(x, { photo: ph[x.id] || '' }, perkOf(pk, x.id));
  return {
    dialogs: out, people, me: { photo: ph[u.id] || '', ...perkOf(pk, u.id) },
    global: g ? { from: g.sender, name: g.name, text: g.body.slice(0, 60), ts: g.ts } : null,
    unread: out.filter((d) => d.unread).length,
  };
}
