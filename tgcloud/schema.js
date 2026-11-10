import { table, integer, text } from 'sdk/db';

export const users = table('users', {
  id:       integer('id').primaryKey(),
  name:     text('name'),
  username: text('username'),
  balance:  integer('balance').notNull().default(0),
  created:  text('created'),
  wear:     integer('wear').notNull().default(0),
  photo:    text('photo'),
});

// Har bir sotib olingan sovg'a. upgraded=1 bo'lsa model/pattern/backdrop (indekslar) to'ldirilgan.
export const gifts = table('gifts', {
  id:       integer('id').primaryKey(),
  owner:    integer('owner').notNull(),
  upgraded: integer('upgraded').notNull().default(0),
  model:    integer('model'),
  pattern:  integer('pattern'),
  backdrop: integer('backdrop'),
  created:  text('created'),
  pinned:   integer('pinned').notNull().default(0),
  price:    integer('price').notNull().default(0),
  hidden:   integer('hidden').notNull().default(0),
  kind:     integer('kind').notNull().default(0),   // kolleksiya: 0 = Plush Pepe, 1 = Durov’s Cap, 2 = B-Day Candle, 3 = Desk Calendar
  num:      integer('num'),            // yaxshilash (upgrade) tartibi bo'yicha raqam: #1, #2, ...
});

// ---------- Chat
// room: 'g' (umumiy) yoki 'd<kichik>_<katta>' (shaxsiy)
export const messages = table('messages', {
  id:     integer('id').primaryKey(),
  room:   text('room').notNull(),
  sender: integer('sender').notNull(),
  name:   text('name'),
  body:   text('body').notNull(),
  ts:     integer('ts').notNull(),
});

export const chatUsers = table('chat_users', {
  id:       integer('id').primaryKey(),
  name:     text('name'),
  username: text('username'),
  lastTs:   integer('last_ts').notNull().default(0),
  banned:   integer('banned').notNull().default(0),
  lastBody: text('last_body'),
});

// Shaxsiy yozishmalar ro'yxati (a < b)
export const dialogs = table('dialogs', {
  id:       integer('id').primaryKey(),
  a:        integer('a').notNull(),
  b:        integer('b').notNull(),
  lastId:   integer('last_id').notNull().default(0),
  lastFrom: integer('last_from'),
  lastBody: text('last_body'),
  lastTs:   integer('last_ts').notNull().default(0),
  readA:    integer('read_a').notNull().default(0),
  readB:    integer('read_b').notNull().default(0),
});

// ---------- Bot sozlamalari (majburiy obuna kanali) — bitta qator, id=1
export const settings = table('settings', {
  id:      integer('id').primaryKey(),
  channel: text('channel'),
  url:     text('url'),
  title:   text('title'),
});

// Admin yozishmasi holati: '' | 'ch' (kanal nomini kutmoqda) | 'bc' (tarqatma xabarini kutmoqda)
export const adminState = table('admin_state', {
  id:   integer('id').primaryKey(),
  mode: text('mode'),
});

// ---------- To'lovlar (Telegram Stars). id = telegram_payment_charge_id: bir to'lov ikki marta qo'shilmasligi uchun.
export const payments = table('payments', {
  id:      text('id').primaryKey(),
  user:    integer('user').notNull(),
  tg:      integer('tg').notNull(),        // to'langan Telegram Stars
  stars:   integer('stars').notNull(),     // berilgan ilova Stars
  created: text('created'),
});

// ---------- Premium va emoji-status (alohida jadval: mavjud jadvallarni o'zgartirmaslik uchun)
export const perks = table('perks', {
  id:     integer('id').primaryKey(),                    // foydalanuvchi ID
  until:  integer('until').notNull().default(0),         // Premium tugash vaqti (ms). 0 yoki o'tib ketgan = Premium yo'q
  status: integer('status').notNull().default(0),        // 0 = status yo'q, aks holda STATUS ro'yxatidagi indeks + 1
});

// ---------- Hikoyalar (24 soatdan keyin o'chadi)
export const stories = table('stories', {
  id:    integer('id').primaryKey(),
  owner: integer('owner').notNull(),
  kind:  text('kind').notNull(),                         // 't' = matn, 'p' = rasm (data URL)
  body:  text('body').notNull(),
  bg:    integer('bg').notNull().default(0),             // matnli hikoya foni (indeks)
  ts:    integer('ts').notNull(),
});

// ---------- Doimiy animatsiya (VIP): admin ID bo'yicha beradi. Bunday foydalanuvchida animatsiya hech qachon avtomatik o'chmaydi
// (na qurilma qotganda, na foydalanuvchilar ko'payganda). Alohida jadval: mavjud jadvallarni o'zgartirmaslik uchun.
export const animVip = table('anim_vip', {
  id: integer('id').primaryKey(),     // foydalanuvchi ID
  ts: text('ts'),
});
