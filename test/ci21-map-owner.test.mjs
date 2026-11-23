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

if (owner.slug === 'nine-dragon-stack') test('Nine retains every extra map source root across package relocation', () => {
  // These authored addresses predate the split. Retain their logical input
  // identities and verify the defining files in the installed owner package.
  for (const name of ['mapAssembly', 'mapScenes', 'mapRaster', 'groundMap']) {
    assert.ok(settings.inputs.includes(`../../sharddev/bake/${name}.ts`));
    assert.ok(existsSync(sdkFile(`bake/${name}.ts`)));
  }
  assert.ok(settings.inputs.includes('../../sharddev/kit/geometryPack.ts'));
  assert.ok(existsSync(sdkFile('kit/geometryPack.ts')));
  assert.ok(settings.inputs.includes('../../commons/bake/portableMath.ts'));
  assert.ok(existsSync(resolve(sdk, 'src/commons/bake/portableMath.ts')));
  assert.equal(mapFile, resolve(source, 'data/map.json'));
  assert.ok(!settings.inputs.includes('../../../scripts/map-painter.mjs'));
});
