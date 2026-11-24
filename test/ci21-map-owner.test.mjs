// CI21 map-source-inputs: the owner's actual program and installed raster.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import ts from '@typescript/typescript6';

const require = createRequire(import.meta.url);
const owner = JSON.parse(readFileSync('test/ci21-map-owner.json', 'utf8'));
const source = resolve(owner.source), program = resolve(source, owner.program);
const mapFile = ['data/map.json', 'look/map.json'].map(file => resolve(source, file)).find(existsSync);
assert.ok(mapFile, 'The owner must retain its actual authored map settings');
const settings = JSON.parse(readFileSync(mapFile, 'utf8'));
const sdk = dirname(require.resolve('@wildshard/sdk/package.json'));
const sdkFile = file => realpathSync(resolve(sdk, 'src/sharddev', file));
function programInputs(entry) {
  const options = { moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true, resolveJsonModule: true };
  return new Set(ts.preProcessFile(readFileSync(entry, 'utf8')).importedFiles.map(dependency => {
    const found = ts.resolveModuleName(dependency.fileName, entry, options, ts.sys).resolvedModule;
    assert.ok(found, `Unresolved map input ${dependency.fileName} from ${entry}`);
    return realpathSync(found.resolvedFileName);
  }));
}

test(`${owner.slug}: source-owned maps declare their program and defining raster inputs`, () => {
  assert.ok(settings.inputs.length > 0);
  const roots = settings.inputs.map(input => resolve(source, input));
  assert.ok(roots.some(root => program === root || program.startsWith(`${root}/`)), 'Map declaration must cover the actual source entry');
  const ground = sdkFile('bake/groundMap.ts');
  assert.ok(programInputs(program).has(ground), 'The actual producer must import the installed defining raster entry');
  const raster = programInputs(ground);
  for (const name of ['mapScenes', 'mapRaster']) assert.ok(raster.has(sdkFile(`bake/${name}.ts`)), `Missing defining ${name}`);
});

// FORMAT-PRUNE FP50 (SHARD-COMPAT SA10): map inputs stay in the shard source. The pre-split
// `../../sharddev/*` addresses left it; the defining files live in the installed SDK, which the
// raster test above already checks.
test(`${owner.slug}: map inputs stay in the shard source`, () => {
  assert.deepEqual(settings.inputs.filter(input => input.startsWith('../')), []);
  for (const name of ['mapAssembly', 'mapScenes', 'mapRaster', 'groundMap']) assert.ok(existsSync(sdkFile(`bake/${name}.ts`)));
  assert.ok(existsSync(sdkFile('kit/geometryPack.ts')));
});
