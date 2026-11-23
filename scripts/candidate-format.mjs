// Candidate engines retain their own declared format dependency. The author
// project and SDK keep their existing pins while Ring 3 proves that graph.
import { readFileSync, writeFileSync } from 'node:fs';
import { engineRequire } from '@wildshard/sdk/headless';

const root = new URL('../', import.meta.url);
const engine = engineRequire('./package.json');
const format = engine.dependencies?.['@wildshard/format'];
if (typeof format !== 'string' || !/^npm:@wildshard\/shard-format@\^?\d+\.\d+\.\d+$/u.test(format)) {
  throw new Error('Candidate engine must declare its published format dependency');
}
// Qualify the declared minimum exactly so the candidate graph cannot drift.
const exact = format.replace('@^', '@');
const file = new URL('package.json', root), pkg = JSON.parse(readFileSync(file, 'utf8'));
pkg.pnpm ??= {}; pkg.pnpm.overrides ??= {};
pkg.pnpm.overrides['@wildshard/engine>@wildshard/format'] = exact;
// Source installs do not inherit the candidate checkout's frozen lockfile.
const wire = engine.dependencies?.['@wildshard/wire'];
if (typeof wire === 'string' && /^\^?\d+\.\d+\.\d+$/u.test(wire)) {
  pkg.pnpm.overrides['@wildshard/engine>@wildshard/wire'] = wire.replace(/^\^/u, '');
}
if (process.argv.includes('--ci21')) {
  pkg.pnpm.packageExtensions ??= {};
  // pnpm's global store isolates each package. Their source and declaration
  // imports need Three types beside the package that actually imports them.
  for (const name of ['@wildshard/kit', 'navcat', 'postprocessing']) {
    pkg.pnpm.packageExtensions[name] = {
      dependencies: { '@types/three': pkg.devDependencies['@types/three'] },
    };
  }
  // Type-lint the source reader against one format while keeping the pinned SDK.
  pkg.dependencies['@wildshard/format'] = exact;
  for (const name of ['sdk', 'build', 'dev', 'upload']) {
    pkg.pnpm.overrides[`@wildshard/${name}>@wildshard/format`] = exact;
  }
  pkg.pnpm.overrides['@wildshard/kit>@wildshard/shard-format'] = exact.split('@').at(-1);
}
// Published 0.12.0 and 0.13.0 ship the same runtime-cost schema as 0.4.9.
const authorFormat = '@wildshard/shard-format@0.4.9';
const candidateFormat = exact.slice('npm:'.length);
const patches = pkg.pnpm.patchedDependencies;
const epochPatch = patches?.[authorFormat];
if (epochPatch !== undefined) {
  if (['@wildshard/shard-format@0.12.0', '@wildshard/shard-format@0.13.0'].includes(candidateFormat)) {
    patches[candidateFormat] = epochPatch;
  }
}
writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
console.log(`Candidate engine uses its defining format dependency: ${exact}`);
