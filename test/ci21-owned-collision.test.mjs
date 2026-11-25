import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ownedCollisionFloor} from './fixtures/nalati-owned-collision-oracle.ts';

test('the independent owner capture retains every non-edge solid and refuses changed bytes',()=>{
 const capture=readFileSync(new URL('./fixtures/nalati-physics-owned-capture.json',import.meta.url));
 const previous=process.cwd();mkdirSync('tmp/ci21-owned-collision-controls',{recursive:true});
 const root=mkdtempSync(resolve('tmp/ci21-owned-collision-controls','case-'));
 try{
  process.chdir(root);mkdirSync('test/fixtures',{recursive:true});
  writeFileSync('test/fixtures/nalati-physics-owned-capture.json',capture);assert.equal(ownedCollisionFloor(),2681);
  const changed=Buffer.from(capture);changed[changed.length-1]^=1;
  writeFileSync('test/fixtures/nalati-physics-owned-capture.json',changed);assert.throws(()=>ownedCollisionFloor(),/capture differs/u);
 }finally{process.chdir(previous);rmSync(root,{recursive:true,force:true});}
});
