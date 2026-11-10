import { api } from 'sdk';
import { parsePayload, validOrder } from '../lib/pay.js';

// To'lovdan oldin Telegram 10 soniya ichida javob kutadi
export default async function (q) {
  const ok = validOrder(parsePayload(q.invoice_payload), q.from && q.from.id, q.currency, q.total_amount);
  await api.answerPreCheckoutQuery(ok
    ? { pre_checkout_query_id: q.id, ok: true }
    : { pre_checkout_query_id: q.id, ok: false, error_message: 'To‘lov ma’lumotlari noto‘g‘ri. Qayta urinib ko‘ring.' });
}
