import { db } from 'sdk';
import { eq } from 'sdk/db';
import { animVip } from '../schema.js';

export async function isVip(id) {
  try { return !!(await db.select().from(animVip).where(eq(animVip.id, Number(id))).get()); } catch (e) { return false; }
}
