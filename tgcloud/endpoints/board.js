import { EndpointError as __EE } from 'sdk';
import { allGifts } from '../lib/game.js';
import { db } from 'sdk';
import { gifts, users } from '../schema.js';
import { ensureUser } from '../lib/game.js';

async function __h(input, ctx) {
  const me = ctx.initData.user;
  await ensureUser(me);
  const all = await allGifts();
  const names = {};
  for (const r of await db.select().from(users).all()) names[r.id] = r;
  const agg = {};
  for (const g of all) {
    const a = (agg[g.owner] = agg[g.owner] || { id: g.owner, up: 0, total: 0 });
    a.total++; if (g.upgraded) a.up++;
  }
  const list = Object.values(agg).sort((a, b) => b.up - a.up || b.total - a.total);
  const top = list.slice(0, 20).map((a, i) => ({
    rank: i + 1, id: a.id, name: (names[a.id] && names[a.id].name) || 'Foydalanuvchi', up: a.up, total: a.total, me: a.id === me.id,
  }));
  const myRank = list.findIndex((a) => a.id === me.id);
  return { top, myRank: myRank < 0 ? null : myRank + 1 };
}

// Diagnostika: serverdagi haqiqiy xato matni ilovada ko'rinadi (log yo'q bo'lgani uchun)
export default async function (input, ctx) {
  try { return await __h(input, ctx); }
  catch (e) {
    if (e && e.code && e.name === 'EndpointError') throw e;
    console.error('board.js xato', e && e.stack || e);
    throw new __EE('[board] ' + String((e && e.message) || e).slice(0, 180), { code: 'SERVER' });
  }
}
