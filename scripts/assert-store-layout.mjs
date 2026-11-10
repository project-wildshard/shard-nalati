// J230: prove the real pinned/candidate install uses the global store.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
if(process.env.GITHUB_ACTIONS==='true')assert.equal(process.env.CI,'true','Hosted runner must retain CI');
const metadata=JSON.parse(readFileSync('node_modules/.modules.yaml','utf8'));
const store=realpathSync(metadata.storeDir),links=realpathSync(resolve('node_modules',metadata.virtualStoreDir));
assert.equal(links,resolve(store,'links'),'Expected the global virtual store');
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const roots=Object.keys({...pkg.dependencies,...pkg.devDependencies});
for(const name of roots){const slot=realpathSync(resolve('node_modules',name));assert.ok(slot.startsWith(links+sep),`${name} reached outside the installed store`);}
const fromEngine=createRequire(new URL('./src/sharddev/package.json',import.meta.resolve('@wildshard/engine/package.json')));
for(const name of ['vite','@typescript/typescript6']){const slot=realpathSync(fromEngine.resolve(name));assert.ok(slot.startsWith(links+sep),`Engine ${name} reached outside the installed store`);}
const engineSharp=realpathSync(fromEngine.resolve('sharp'));
assert.ok(engineSharp.startsWith(links+sep),'Engine map decoder reached an ambient Sharp');
console.log(`global-store-layout ${JSON.stringify({store,links,declaredRoots:roots.length,engineSharp,runnerCi:process.env.CI})}`);
