// oxlint-disable-next-line import/no-nodejs-modules -- Native compilation stays outside DOM workers and their globals.
import { execFile, execFileSync } from 'node:child_process';
// oxlint-disable-next-line import/no-nodejs-modules -- Every immutable test cache loan is checked against complete original pins.
import { existsSync, readFileSync } from 'node:fs';
// oxlint-disable-next-line import/no-nodejs-modules -- Keep the frozen oracle beneath repository tmp.
import { resolve as resolvePath } from 'node:path';
import { hashImmutableBytes } from '@wildshard/format/immutable';
import pins from './nalati-species-files.json' with { type: 'json' };

const names = ['species.json', 'bodies.bin', 'boot.json', 'held-weapons.wasm', 'held-witness.bin'];
const metadata = pins[0];
if (metadata === undefined || pins.length !== names.length) throw new Error('Missing original species file inventory');
const original = metadata;
const compiler = ['--experimental-transform-types', '--import',
  import.meta.resolve('@wildshard/engine/scripts/sim-node-loader.mjs'),
  'test/fixtures/prepare-nalati-original-species.ts'];

/** Source-built immutable predecessor oracle; never evidence for the current producer's correctness.
 * The cold construction uses the real compiler in Node. Every hit checks all five complete original pins. */
export function originalSpeciesFiles(directory = `tmp/nalati-original-species/${original.sha256}`): ReadonlyMap<string, Uint8Array<ArrayBuffer>> {
  const root = resolvePath(directory);
  if (!existsSync(root)) execFileSync(process.execPath, [...compiler, root], { stdio: ['ignore', 'pipe', 'pipe'], timeout:14_000 });
  const files = new Map<string, Uint8Array<ArrayBuffer>>();
  for (const [index, pin] of pins.entries()) {
    const name = names[index];
    if (name === undefined) throw new Error('Unknown original species file');
    const bytes = Uint8Array.from(readFileSync(resolvePath(root, name)));
    if (bytes.length !== pin.bytes || hashImmutableBytes(bytes) !== pin.sha256) throw new Error(`Original species test cache differs: ${name}`);
    files.set(name, bytes);
  }
  return files;
}

/** Start the independent source-built oracle while the caller constructs its
 * cold candidate. Every hit still reads and checks the complete five files;
 * failed preparation never falls back to another child or unchecked bytes. */
export async function prepareOriginalSpeciesFiles(directory = `tmp/nalati-original-species/${original.sha256}`): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  const root = resolvePath(directory);
  if (!existsSync(root)) {
    await new Promise<void>((resolve,reject)=>{
      execFile(process.execPath,[...compiler,root],{timeout:14_000},(error:Error|null,stdout,stderr)=>{
          if(error===null)resolve();else reject(Object.assign(error,{stdout,stderr}));
        });
    });
    if (!existsSync(root)) throw new Error('Original species preparation did not publish');
  }
  return originalSpeciesFiles(root);
}

let prepared: ReadonlyMap<string, Uint8Array<ArrayBuffer>> | undefined;
const privateLoans=new Map<string,ReadonlyMap<string,Uint8Array<ArrayBuffer>>>();
/** Each legacy fixture borrows detached bytes from the same full pinned source oracle. */
export function originalSpeciesFile(name: string, directory?: string): Uint8Array<ArrayBuffer> {
  const root=directory===undefined?undefined:resolvePath(directory);
  let files=root===undefined?prepared:privateLoans.get(root);
  if(files===undefined){
    files=originalSpeciesFiles(root);
    if(root===undefined)prepared=files;else privateLoans.set(root,files);
  }
  const bytes = files.get(name);
  if (bytes === undefined) throw new Error(`Unknown original species file: ${name}`);
  return bytes.slice();
}

/** Admit the full original JSON at each existing fixture's own schema boundary. */
export function originalSpeciesJson(name: 'species.json' | 'boot.json'): unknown {
  const value: unknown = JSON.parse(new TextDecoder().decode(originalSpeciesFile(name)));
  return value;
}

/** Historical output identities select pinned bytes without reopening retired publications. */
export function originalSpeciesOutput(path: string): Uint8Array<ArrayBuffer> {
  const name = names[pins.findIndex(pin => pin.path === path)];
  if (name === undefined) throw new Error(`Unknown original species output: ${path}`);
  return originalSpeciesFile(name);
}

/** Release only the caller-owned memoized loans when its fixture ends. */
export function forgetOriginalSpeciesLoans(directory:string):void{privateLoans.delete(resolvePath(directory));}
