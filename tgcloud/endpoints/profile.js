import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts, users, chatUsers } from '../schema.js';
import { ensureUser, pub, ensureNums } from '../lib/game.js';
import { perkMap, perkOf } from '../lib/perks.js';

export default async function (input, ctx) {
  await ensureUser(ctx.initData.user);
  await ensureNums();
  const id = Number(input.id);
  let r = await db.select().from(users).where(eq(users.id, id)).get();
  if (!r) r = await db.select().from(chatUsers).where(eq(chatUsers.id, id)).get();
  if (!r) throw new EndpointError('Foydalanuvchi topilmadi', { code: 'NO_USER' });
  const list = (await db.select().from(gifts).where(eq(gifts.owner, r.id)).all()).filter((g) => !g.hidden).sort((a, b) => b.id - a.id);
  const wearG = list.find((g) => g.id === r.wear && g.up) || null;
  if (list.length > 600) list.length = 600;   // juda ko'p sovg'ali foydalanuvchida javob katta bo'lib ketmasin
  list.forEach((g, i) => { list[i] = pub(g); });
  const pk = perkOf(await perkMap([r.id]), r.id);
  return { prem: pk.prem, st: pk.st, id: r.id, name: r.name, username: r.username || '', photo: r.photo || '', wear: wearG ? pub(wearG) : null, gifts: list };
}
