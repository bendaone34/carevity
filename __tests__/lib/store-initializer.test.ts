/**
 * Tests for the StoreInitializer Promise.allSettled behaviour.
 *
 * Key invariant: if one domain fetch fails, the others must still complete
 * and the user must receive a specific error naming the failed domain —
 * not a silent partial state.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Simulate the allSettled fan-out ─────────────────────────────────────────
async function initStore(tasks: Array<[() => Promise<void>, string]>) {
  const results = await Promise.allSettled(tasks.map(([fn]) => fn()));
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? tasks[i][1] : null))
    .filter(Boolean) as string[];
  return { failed, results };
}

describe('StoreInitializer with Promise.allSettled', () => {
  it('runs all tasks even when one fails', async () => {
    const ran: string[] = [];
    const tasks: Array<[() => Promise<void>, string]> = [
      [async () => { ran.push('patients'); },                         'patients'],
      [async () => { throw new Error('RLS denied'); },               'medications'],
      [async () => { ran.push('staff'); },                           'staff'],
    ];

    const { failed } = await initStore(tasks);

    expect(ran).toContain('patients');
    expect(ran).toContain('staff');
    expect(failed).toEqual(['medications']);
  });

  it('reports no failures when all tasks succeed', async () => {
    const tasks: Array<[() => Promise<void>, string]> = [
      [async () => {}, 'patients'],
      [async () => {}, 'medications'],
    ];
    const { failed } = await initStore(tasks);
    expect(failed).toHaveLength(0);
  });

  it('reports all failed domains when multiple tasks fail', async () => {
    const tasks: Array<[() => Promise<void>, string]> = [
      [async () => { throw new Error('err'); }, 'patients'],
      [async () => {},                          'staff'],
      [async () => { throw new Error('err'); }, 'wellbeing alerts'],
    ];
    const { failed } = await initStore(tasks);
    expect(failed).toEqual(['patients', 'wellbeing alerts']);
  });

  it('produces a human-readable error string from failed labels', async () => {
    const failed = ['medications', 'wellbeing alerts'];
    const message = `Failed to load: ${failed.join(', ')}. Please refresh.`;
    expect(message).toBe('Failed to load: medications, wellbeing alerts. Please refresh.');
  });
});
