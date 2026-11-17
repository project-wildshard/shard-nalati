// Seal an ordinary pinned producer's inputs before lending its bytes to a source runtime.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const directory='tmp/ci21-source';mkdirSync(directory,{recursive:true});
function inputs(){
 const git=spawnSync('git',['ls-files','-z','--','src','public'],{encoding:'utf8'});assert.equal(git.status,0,git.stderr);
 return git.stdout.split('\0').filter(Boolean).sort().map(path=>({path,sha256:hash(path)}));
}
function productFiles(root,prefix=''){
 return readdirSync(join(root,prefix),{withFileTypes:true}).flatMap(entry=>{
  const path=prefix?`${prefix}/${entry.name}`:entry.name;
  assert(!entry.isSymbolicLink(),'Source product contains no foreign symlink');
  return entry.isDirectory()?productFiles(root,path):[{path,sha256:hash(join(root,path))}];
 }).sort((a,b)=>a.path.localeCompare(b.path));
}
if(process.argv[2]==='begin'){
 const revision=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});assert.equal(revision.status,0,revision.stderr);
 writeFileSync(`${directory}/producer-inputs.json`,JSON.stringify({schema:1,sourceRevision:revision.stdout.trim(),inputs:inputs(),package:hash('package.json'),lock:hash('pnpm-lock.yaml')},null,2)+'\n');
}else if(process.argv[2]==='seal'){
 const before=JSON.parse(readFileSync(`${directory}/producer-inputs.json`,'utf8'));
 assert.deepEqual(inputs(),before.inputs,'Producer inputs changed during the normal build');
 assert.equal(hash('package.json'),before.package,'Producer graph changed during build');assert.equal(hash('pnpm-lock.yaml'),before.lock,'Producer lock changed during build');
 const path='out/nalati-grasslands',files=productFiles(path);assert(files.some(row=>row.path==='shard.json'),'Normal producer must emit its complete shardfile');
 writeFileSync(`${directory}/product.json`,JSON.stringify({...before,product:'nalati-grasslands',files},null,2)+'\n');
 console.info(`Sealed ordinary producer: ${before.inputs.length} exact source inputs, ${files.length} product files`);
}else throw new Error('Expected begin or seal around the ordinary pinned build');
