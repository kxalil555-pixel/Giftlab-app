import { ensureUser } from '../lib/game.js';
import { allChatUsers, perkMap, perkOf, photoMap } from '../lib/perks.js';

// Qidiruv: ism yoki @username bo'yicha barcha foydalanuvchilar ichidan (eng ko'pi 20 ta)
export default async function (input, ctx) {
  const u = ctx.initData.user;
  await ensureUser(u);
  const q = String(input.q || '').trim().replace(/^@/, '').toLowerCase().slice(0, 40);
  if (q.length < 2) return { users: [] };
  const hit = (await allChatUsers())
    .filter((p) => p.id !== u.id && !p.banned && (String(p.name || '').toLowerCase().includes(q) || String(p.username || '').toLowerCase().includes(q) || String(p.id) === q))
    .sort((a, b) => b.lastTs - a.lastTs).slice(0, 20);
  const ids = hit.map((p) => p.id);
  const [pk, ph] = await Promise.all([perkMap(ids), photoMap(ids)]);
  return { users: hit.map((p) => ({ id: p.id, name: p.name, username: p.username || '', photo: ph[p.id] || '', ...perkOf(pk, p.id) })) };
}
