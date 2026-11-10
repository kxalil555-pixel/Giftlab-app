import { lock, kindState, ksAdd, ksDel, maxGiftId } from '../lib/game.js';
import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts } from '../schema.js';
import { colOf, OPEN_KIND } from '../lib/config.js';
import { ensureUser, assertFunds, addStars, pub, balanceOf, requireSub } from '../lib/game.js';

let _nextId = 0;

async function run(input, ctx) {
  const u = ctx.initData.user;
  const user = await ensureUser(u);
  const col = colOf(input.kind == null ? OPEN_KIND : input.kind), kind = col.k;
  if (!col.open) throw new EndpointError('Hammasi sotilgan', { code: 'SOLD_OUT' });
  const st = await kindState(kind);
  const sold0 = st.count;
  if (sold0 >= col.supply) { throw new EndpointError('Hammasi sotilgan', { code: 'SOLD_OUT' }); }
  assertFunds(user, col.price);

  if (!_nextId) _nextId = (await maxGiftId()) + 1;
  let id = _nextId;
  const row = { owner: u.id, kind, upgraded: 0, created: new Date().toISOString() };
  let ok = false;
  for (let t = 0; t < 12 && !ok; t++) {
    try { await db.insert(gifts).values({ id, ...row }).run(); ok = true; }
    catch (e) { id++; }
  }
  if (!ok) { _nextId = 0; throw new EndpointError('Qayta urinib koring', { code: 'RETRY' }); }
  _nextId = id + 1;

  ksAdd(kind, { ...row, upgraded: 0 });
  const soldNow = st.count;

  await addStars(user, -col.price);
  return { gift: pub({ id, ...row }), sold: Math.min(soldNow, col.supply), balance: balanceOf(user) };
}

// Obuna tekshiruvi (Telegram API) navbatdan TASHQARIDA — u boshqalarni kutdirmasin
export default async (input, ctx) => {
  const user = await ensureUser(ctx.initData.user);
  await requireSub(user);
  return lock(() => run(input, ctx));
};
