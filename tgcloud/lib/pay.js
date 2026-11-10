import { db, api } from 'sdk';
import { eq, sql } from 'sdk/db';
import { users, payments } from '../schema.js';
import { STAR_RATE, TG_MIN, TG_MAX, WEBAPP_URL } from './config.js';
import { lock } from './game.js';

// invoice_payload: "s:<userId>:<telegramStars>"
export const parsePayload = (p) => {
  const m = /^s:(\d+):(\d+)$/.exec(String(p || ''));
  return m ? { uid: Number(m[1]), tg: Number(m[2]) } : null;
};
export const validOrder = (o, uid, currency, total) =>
  !!o && o.uid === Number(uid) && currency === 'XTR' && o.tg === Number(total) && o.tg >= TG_MIN && o.tg <= TG_MAX;

// Muvaffaqiyatli to'lov: balansga Stars qo'shadi (bir to'lov faqat bir marta)
export function credit(msg) {
  return lock(async () => {
    const sp = msg.successful_payment;
    const o = parsePayload(sp.invoice_payload);
    if (!validOrder(o, msg.from.id, sp.currency, sp.total_amount)) { console.error('Noto‘g‘ri to‘lov', JSON.stringify(sp)); return; }
    const get = o.tg * STAR_RATE;
    try {
      await db.insert(payments).values({ id: sp.telegram_payment_charge_id, user: o.uid, tg: o.tg, stars: get, created: new Date().toISOString() }).run();
    } catch (e) { return; } // allaqachon hisobga olingan
    try {
      await db.update(users).set({ balance: sql`${users.balance} + ${get}` }).where(eq(users.id, o.uid)).run();
    } catch (e) {
      try { await db.delete(payments).where(eq(payments.id, sp.telegram_payment_charge_id)).run(); } catch (e2) {}
      throw e;
    }
    try {
      await api.sendMessage({
        chat_id: o.uid,
        text: `✅ To‘lov qabul qilindi: +${String(get).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} Stars`,
        reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined,
      });
    } catch (e) {}
  });
}
