// CI21 preserves original case names, exact compiler admission and unchanged wire oracles.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from '@typescript/typescript6';
import { fileURLToPath } from 'node:url';
import { dirname, relative } from 'node:path';
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
 const lint=pkg.scripts['check:ci21-candidate'].split('--deny-warnings ')[1]?.split(' && vitest')[0]?.trim().split(/\s+/u);
 if(JSON.stringify(lint)!==JSON.stringify(files))throw new Error('CI21 candidate lint command differs from the admitted compiler closure');
}

function testRoot(node){
  if(ts.isIdentifier(node))return ['test','it','describe'].includes(node.text)?node.text:null;
  if(ts.isPropertyAccessExpression(node))return testRoot(node.expression);
  return ts.isCallExpression(node)?testRoot(node.expression):null;
}
for(const row of record.files){
  if(row.caseCompanion!==undefined){
    const pair=row.caseCompanion;
    if(pair.repository!=='project-wildshard/sharddev'||!/^test\/[a-z-]+\.test\.ts$/u.test(pair.targetPath??'')||!/^[a-f0-9]{40}$/u.test(pair.revision??'')||!/^[a-f0-9]{40}$/u.test(pair.targetBlob??'')||!Array.isArray(pair.originalTests)||!Array.isArray(row.sourceTests)||JSON.stringify([...pair.originalTests,...row.originalTests])!==JSON.stringify(row.sourceTests)||new Set(row.sourceTests).size!==row.sourceTests.length)throw new Error('CI21 paired SDK cases must pin and retain the complete source partition');
  }

  const text=readFileSync(new URL(row.targetPath,root));
  if(createHash('sha1').update(`blob ${text.length}\0`).update(text).digest('hex')!==row.targetBlob)throw new Error(`CI21 reviewed test binding changed: ${row.targetPath}`);
  const source=ts.createSourceFile(row.targetPath,text.toString('utf8'),ts.ScriptTarget.Latest,true),titles=[];
  let imported=false;
  for(const statement of source.statements)if(ts.isImportDeclaration(statement)&&ts.isStringLiteral(statement.moduleSpecifier)&&statement.moduleSpecifier.text==='vitest'){
    const names=statement.importClause?.namedBindings;
    if(names!==undefined&&ts.isNamedImports(names))for(const entry of names.elements){
      const name=entry.propertyName?.text??entry.name.text;
      if(['test','it','describe'].includes(name)){
        if(name!=='test'||entry.name.text!=='test')throw new Error('CI21 wire cases require direct test imports');
        imported=true;
      }
    }
  }
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.initializer!==undefined&&testRoot(node.initializer)!==null)throw new Error('CI21 wire test aliases refuse');
    if(ts.isCallExpression(node)&&testRoot(node.expression)!==null){
      if(!imported||!ts.isIdentifier(node.expression)||node.expression.text!=='test'||!ts.isStringLiteral(node.arguments[0])||![node.arguments[1],node.arguments[2]].some(body=>body!==undefined&&(ts.isArrowFunction(body)||ts.isFunctionExpression(body))))throw new Error('CI21 wire cases must run directly in default discovery');
      titles.push(node.arguments[0].text);
    }
    ts.forEachChild(node,visit);
  };
  visit(source);
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
