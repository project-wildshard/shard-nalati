// CI21 preserves original case names, exact compiler admission and unchanged wire oracles.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from '@typescript/typescript6';
import { fileURLToPath } from 'node:url';
import { dirname, relative } from 'node:path';
import { caseInventory } from './ci21-case-inventory.mjs';
const root=new URL('../',import.meta.url);
const record=JSON.parse(readFileSync(new URL(process.argv[2] ?? 'test/ci21-wire-ports.json',root),'utf8'));
for(const fixture of record.supportFixtures??[]){
 const bytes=readFileSync(new URL(fixture.targetPath,root));
 if(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==fixture.targetBlob)throw new Error(`CI21 retained support fixture changed: ${fixture.targetPath}`);
}
const compiler=JSON.parse(readFileSync(new URL(process.argv[3] ?? 'test/tsconfig.json',root),'utf8'));
const expected=[...record.files.map(row=>row.targetPath),...record.files.flatMap(row=>row.compilerSupport??[])].map(path=>path.replace(/^test\//u,''));
if(JSON.stringify(compiler.files)!==JSON.stringify(expected))throw new Error('CI21 golden compiler files differ from retained cases');
if(record.typedLintFiles!==undefined){
 const configFile=fileURLToPath(new URL(process.argv[3]??'test/tsconfig.json',root));
 const parsed=ts.parseJsonConfigFileContent(compiler,ts.sys,dirname(configFile));
 const program=ts.createProgram(parsed.fileNames,parsed.options);
 const files=program.getSourceFiles().map(file=>relative(fileURLToPath(root),file.fileName)).filter(file=>file.startsWith('test/')&&file.endsWith('.ts')&&!file.endsWith('.d.ts')&&!file.endsWith('.d.json.ts')).sort();
 if(JSON.stringify(files)!==JSON.stringify(record.typedLintFiles))throw new Error('CI21 typed lint must cover the complete actual compiler helper closure');
 const pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
 if(!pkg.scripts['check:ci21-candidate'].includes(' && node scripts/ci21-candidate-lint.mjs && vitest'))throw new Error('CI21 candidate command must run native lint over the complete admitted compiler closure');
}

for(const row of record.files){
  if(row.caseCompanion!==undefined){
    const pair=row.caseCompanion;
    if(pair.repository!=='project-wildshard/sharddev'||!/^test\/[a-z-]+\.test\.ts$/u.test(pair.targetPath??'')||!/^[a-f0-9]{40}$/u.test(pair.revision??'')||!/^[a-f0-9]{40}$/u.test(pair.targetBlob??'')||!Array.isArray(pair.originalTests)||!Array.isArray(row.sourceTests)||JSON.stringify([...pair.originalTests,...row.originalTests])!==JSON.stringify(row.sourceTests)||new Set(row.sourceTests).size!==row.sourceTests.length)throw new Error('CI21 paired SDK cases must pin and retain the complete source partition');
  }

  const text=readFileSync(new URL(row.targetPath,root));
  if(createHash('sha1').update(`blob ${text.length}\0`).update(text).digest('hex')!==row.targetBlob)throw new Error(`CI21 reviewed test binding changed: ${row.targetPath}`);
  const titles=caseInventory(text.toString('utf8'),row.targetPath);
  if(JSON.stringify(titles)!==JSON.stringify(row.originalTests))throw new Error(`CI21 original golden case missing: ${row.targetPath}`);
  if(row.cacheHelper!==undefined){
    const cache=readFileSync(new URL(row.cacheHelper.targetPath,root));
    if(createHash('sha1').update(`blob ${cache.length}\0`).update(cache).digest('hex')!==row.cacheHelper.targetBlob)throw new Error(`CI21 original cache helper changed: ${row.cacheHelper.targetPath}`);
  }
  if(row.preparationHelper!==undefined){
    const prep=readFileSync(new URL(row.preparationHelper.targetPath,root));
    if(createHash('sha1').update(`blob ${prep.length}\0`).update(prep).digest('hex')!==row.preparationHelper.targetBlob)throw new Error(`CI21 original preparation helper changed: ${row.preparationHelper.targetPath}`);
  }
  if(row.observationHelper!==undefined){
    const helper=readFileSync(new URL(row.observationHelper.targetPath,root));
    if(createHash('sha1').update(`blob ${helper.length}\0`).update(helper).digest('hex')!==row.observationHelper.targetBlob)throw new Error(`CI21 original observation helper changed: ${row.observationHelper.targetPath}`);
  }
  for(const fixture of row.additionalFixtures??[]){
    const bytes=readFileSync(new URL(fixture.targetPath,root));
    if(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==fixture.targetBlob)throw new Error(`CI21 additional original fixture changed: ${fixture.targetPath}`);
  }
  const bytes=readFileSync(new URL(row.fixturePath,root));
  if(createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==row.fixtureBlob)throw new Error(`CI21 original golden fixture changed: ${row.fixturePath}`);
}
console.log(`CI21 retained ${record.files.length} original wire cases and compiler paths`);
