// oxlint-disable-next-line import/no-nodejs-modules -- A source-runtime proof borrows only a sealed normal producer's actual bytes.
import { readFileSync } from 'node:fs';
// oxlint-disable-next-line import/no-nodejs-modules -- Verify complete source and product content before lending it to native owners.
import { createHash } from 'node:crypto';
import * as v from 'valibot';

const entry = v.strictObject({ path: v.string(), sha256: v.pipe(v.string(), v.regex(/^[a-f0-9]{64}$/u)) });
const Receipt = v.strictObject({ schema: v.literal(1), sourceRevision: v.pipe(v.string(), v.regex(/^[a-f0-9]{40}$/u)),
  inputs: v.array(entry), package: v.string(), lock: v.string(), product: v.literal('nalati-grasslands'), files: v.array(entry) });

/** The current normal producer is qualified separately from the source engine.
 * Every retained input and every emitted file must still match, without a fake CI identity or stale-product fallback. */
export function builtProduct(name: string): string {
  if (name !== 'nalati-grasslands') throw new Error('Foreign source product requested');
  const receipt = v.parse(Receipt, JSON.parse(readFileSync('tmp/ci21-source/product.json', 'utf8')));
  if (process.env.GITHUB_SHA !== undefined && receipt.sourceRevision !== process.env.GITHUB_SHA) throw new Error('Source product belongs to another checkout');
  for (const row of receipt.inputs) {
    if (!/^(?:src|public)\//u.test(row.path) || row.path.split('/').includes('..')) throw new Error('Foreign producer input');
    if (createHash('sha256').update(readFileSync(row.path)).digest('hex') !== row.sha256) throw new Error(`Producer source input differs: ${row.path}`);
  }
  const directory = `out/${name}`;
  if (receipt.files.length === 0 || !receipt.files.some(row => row.path === 'shard.json')) throw new Error('Missing complete producer product');
  for (const row of receipt.files) {
    if (row.path.startsWith('/') || row.path.split('/').includes('..')) throw new Error('Foreign producer output');
    if (createHash('sha256').update(readFileSync(`${directory}/${row.path}`)).digest('hex') !== row.sha256) throw new Error(`Producer product bytes differ: ${row.path}`);
  }
  return directory;
}
