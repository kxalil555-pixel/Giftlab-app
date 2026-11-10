import { api, EndpointError } from 'sdk';
import { ensureUser } from '../lib/game.js';
import { STAR_RATE, TG_MIN, TG_MAX } from '../lib/config.js';

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// input: { tg } — nechta Telegram Stars to'lanadi. Telegram Stars invoys havolasini qaytaradi.
export default async function (input, ctx) {
  const u = ctx.initData.user;
  await ensureUser(u);
  const tg = Number(input && input.tg);
  if (!Number.isInteger(tg) || tg < TG_MIN || tg > TG_MAX) throw new EndpointError('Miqdor noto‘g‘ri', { code: 'BAD' });
  const get = tg * STAR_RATE;
  const link = await api.createInvoiceLink({
    title: `${fmt(get)} Stars`,
    description: `Ilovadagi ${fmt(get)} Stars hisobingizga qo‘shiladi.`,
    payload: `s:${u.id}:${tg}`,
    currency: 'XTR',
    prices: [{ label: `${fmt(get)} Stars`, amount: tg }],
  });
  return { link, tg, get };
}
