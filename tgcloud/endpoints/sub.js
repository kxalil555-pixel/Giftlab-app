import { ensureUser, isSub, getChannel } from '../lib/game.js';

export default async function (input, ctx) {
  const u = ctx.initData.user;
  await ensureUser(u);
  const c = await getChannel();
  return { ok: await isSub(u.id), url: c ? c.url : '' };
}
