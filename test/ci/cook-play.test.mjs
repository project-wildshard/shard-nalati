// Ring 2, J186: actual cold cook is 52.09 s locally and the complete
// served live-herd/restore case is 62.10 s. Quick gates stay unchanged.
// Use the shipped cooker/encoder, then only extracted server-pack bytes.
// This complete publish/serve/play journey never joins hooks or Ring 3.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {brotliCompressSync,brotliDecompressSync,constants} from 'node:zlib';
import {test} from 'node:test';

const {readServerPackBook,serverPackFile}=await import('@wildshard/engine/game/shardfile/serverPack');
const {loadHeadlessProduct}=await import('@wildshard/engine/host/headlessProduct');
const {createTrustedHeadlessAdapter}=await import('@wildshard/engine/host/headlessRuntime');
const {outputDescriptor,serverReadsFile}=await import('@wildshard/engine/game/shardfile/outputDescriptor');
const {loadRapier}=await import('@wildshard/engine/physics/rapier');
const require=createRequire(import.meta.url);

test('the real cooked Nalati walks and resumes using only served server files',{timeout:600_000},async()=>{
 const parent=process.env.WS_PROOF_SCRATCH??tmpdir();mkdirSync(parent,{recursive:true});
 const root=mkdtempSync(join(parent,'nalati-cook-')),worlds=[];
 const previous=process.env.WILDSHARD_SPAWN_PART_CACHE;
 process.env.WILDSHARD_SPAWN_PART_CACHE=join(root,'cold-parts');
 try{
  const {cookShard,servedAsIs}=await import('@wildshard/engine/game/shardCook');
  const bin=join(dirname(require.resolve('@wildshard/sharddev/package.json')),'bin/wildshard.mjs'),tar=join(root,'dunes.tar');
  const done=spawnSync(process.execPath,[bin,'pack',resolve('out/nalati-grasslands'),'--out',tar],{encoding:'utf8',timeout:30_000});
  assert.ifError(done.error);assert.equal(done.status,0,done.stderr);
  const cooked=join(root,'cooked'),unpacked=join(root,'server-files');
  // Loose HTTP encoding is an explicit host policy, not a fake part encoder.
  const report=await cookShard(readFileSync(tar),cooked,{now:()=>performance.now(),wireBytes:(url,bytes)=>servedAsIs(url,bytes)?bytes.length:
   brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:4}}).length});
  assert.equal(report.slug,'nalati-grasslands');assert.ok(report.parts.count>0);
  const raw=JSON.parse(readFileSync(join(cooked,report.server.index),'utf8'));
  const pack=readServerPackBook({book:'server',build:'nalati-proof',shards:{[report.slug]:raw}}).shards[report.slug];
  for(const part of [pack,...pack.more??[]]){
   const body=brotliDecompressSync(readFileSync(join(cooked,part.url)));
   assert.equal(body.length,part.bytes);assert.equal(createHash('sha256').update(body).digest('hex'),part.hash);
   for(const [name] of part.files){const target=join(unpacked,name);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,serverPackFile(part,body,name));}
  }
  // No uncooked product, shard source or client part enters either runtime.
  const product=await loadHeadlessProduct(unpacked),shard=product.shardfile,descriptor=outputDescriptor(shard);
  const assets=new Map(descriptor.index.files.filter(file=>serverReadsFile(file,shard.terrain?.collider)&&
   (file.name===undefined||file.kind==='wasm'||file.kind==='tile')).map(file=>
   [file.commons===true?`commons:${file.hash}`:file.hash,readFileSync(join(unpacked,file.path))]));
  const engineRequire=createRequire(require.resolve('@wildshard/engine/package.json'));
  const rapier=await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  const create=async snapshot=>{const world=await createTrustedHeadlessAdapter({shard,assets,product,rapier},snapshot);worlds.push(world);return world;};
  const world=await create(),played=await world.verbTape({version:1,observe:[],segments:[
   {id:'spawn',ticks:1,commands:[]},
   {id:'walk',ticks:120,commands:[{kind:'player',moveX:0,moveZ:-1,yaw:0}]},
   {id:'turn',ticks:120,commands:[{kind:'player',moveX:1,moveZ:0,yaw:Math.PI/2}]}]});
  const [spawn,walk]=played.observations;
  assert.ok(Math.hypot(walk.position[0]-spawn.position[0],walk.position[2]-spawn.position[2])>.25,'Real herd-world walking must move the player');
  const resumed=await create(world.commit().snapshot);
  for(let tick=0;tick<5;tick++){
   const commands=[{kind:'player',moveX:0,moveZ:-1,yaw:0}];world.step(commands);resumed.step(commands);
   assert.deepEqual(resumed.commit(),world.commit(),'The cooked world must continue identically');
  }
  console.log(`real Nalati cook: ${report.seconds.toFixed(2)} s, ${report.server.files} server files, ${report.parts.count} client parts; live herd moved, five restored ticks`);
 }finally{
  for(const world of worlds)await world.dispose();
  if(previous===undefined)delete process.env.WILDSHARD_SPAWN_PART_CACHE;else process.env.WILDSHARD_SPAWN_PART_CACHE=previous;
  rmSync(root,{recursive:true,force:true});
 }
});
