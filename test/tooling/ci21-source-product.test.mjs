import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {builtProduct} from '../fixtures/builtProduct.ts';

test('source-runtime product loans refuse changed source, changed bytes and foreign paths',()=>{
 const previous=process.cwd();mkdirSync('tmp/ci21-source-product-controls',{recursive:true});
 const root=mkdtempSync(resolve('tmp/ci21-source-product-controls','case-'));
 try{
  process.chdir(root);mkdirSync('src',{recursive:true});mkdirSync('out/nalati-grasslands',{recursive:true});mkdirSync('tmp/ci21-source',{recursive:true});
  writeFileSync('src/index.ts','actual producer input');writeFileSync('out/nalati-grasslands/shard.json','actual immutable product');
  const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
  const receipt={schema:1,sourceRevision:process.env.GITHUB_SHA??'a'.repeat(40),package:'a'.repeat(64),lock:'b'.repeat(64),
   inputs:[{path:'src/index.ts',sha256:hash('src/index.ts')}],product:'nalati-grasslands',files:[{path:'shard.json',sha256:hash('out/nalati-grasslands/shard.json')}]};
  const save=()=>writeFileSync('tmp/ci21-source/product.json',JSON.stringify(receipt));save();
  assert.equal(builtProduct('nalati-grasslands'),'out/nalati-grasslands');assert.throws(()=>builtProduct('foreign'));
  writeFileSync('src/index.ts','changed producer input');assert.throws(()=>builtProduct('nalati-grasslands'),/source input differs/u);writeFileSync('src/index.ts','actual producer input');
  writeFileSync('out/nalati-grasslands/shard.json','changed bytes');assert.throws(()=>builtProduct('nalati-grasslands'),/product bytes differ/u);writeFileSync('out/nalati-grasslands/shard.json','actual immutable product');
  writeFileSync('src/untracked.ts','untracked producer input');assert.throws(()=>builtProduct('nalati-grasslands'),/source inventory differs/u);rmSync('src/untracked.ts');
  writeFileSync('out/nalati-grasslands/unlisted.bin','unlisted output');assert.throws(()=>builtProduct('nalati-grasslands'),/product inventory differs/u);rmSync('out/nalati-grasslands/unlisted.bin');
  mkdirSync('src/assets/public',{recursive:true});mkdirSync('public/assets/nalati-grasslands',{recursive:true});
  writeFileSync('src/assets/public/alias.bin','tracked alias source');writeFileSync('public/assets/nalati-grasslands/alias.bin','tracked alias source');
  receipt.inputs.push({path:'src/assets/public/alias.bin',sha256:hash('src/assets/public/alias.bin')});save();
  assert.equal(builtProduct('nalati-grasslands'),'out/nalati-grasslands');
  writeFileSync('public/assets/nalati-grasslands/alias.bin','changed alias');assert.throws(()=>builtProduct('nalati-grasslands'),/Generated public alias differs/u);
  rmSync('public/assets/nalati-grasslands/alias.bin');
  mkdirSync('public/assets/nalati-grasslands/map',{recursive:true});writeFileSync('public/assets/nalati-grasslands/map/top.webp','actual immutable product');
  assert.equal(builtProduct('nalati-grasslands'),'out/nalati-grasslands');
  writeFileSync('public/assets/nalati-grasslands/map/top.webp','unsealed generated map');assert.throws(()=>builtProduct('nalati-grasslands'),/Generated map alias differs/u);
  rmSync('public/assets/nalati-grasslands/map/top.webp');
  receipt.files.push({path:'../foreign.json',sha256:'a'.repeat(64)});save();assert.throws(()=>builtProduct('nalati-grasslands'),/Foreign producer output/u);
 }finally{process.chdir(previous);rmSync(root,{recursive:true,force:true});}
});
