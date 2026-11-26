// CI policy at the package boundary, including explicitly held source candidates.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, relative, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from '@typescript/typescript6';

export function checkTestBoundary(directory = '.', { candidate = false, rewards = false } = {}) {
  const root = resolve(directory), sourceRoot = resolve(root, 'src/shards');
  const read = name => JSON.parse(readFileSync(resolve(root, name), 'utf8'));
  assert.deepEqual(read('test/lift-pending.json'), [], 'The cleared lift queue must stay empty; new coverage must run');
  const problems = [], files = [], imports = new Map();
  const owned = new Set((existsSync(sourceRoot) ? readdirSync(sourceRoot, { withFileTypes: true }) : []).filter(row => row.isDirectory()).map(row => row.name));
  function walk(directory) {
    if (!existsSync(directory)) return;
    for (const row of readdirSync(directory, { withFileTypes: true })) {
      const file = resolve(directory, row.name);
      if (row.isDirectory()) walk(file);
      else if (/\.(?:ts|tsx|mjs|js)$/u.test(file)) files.push(file);
    }
  }
  walk(resolve(root, 'src')); walk(resolve(root, 'test'));
  const checked = new Set(files);
  // Outside importers may execute a test helper even when it is not a test root (the tools are src/scripts/ since the
  // lean move, walked with src/ above).
  walk(resolve(root, '.githooks'));
  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true), edges = [];
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) edges.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require') && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) edges.push(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(source); imports.set(file, edges);
  }
  const candidatePrefix = 'test/ci21-candidate/';
  const candidateTests = files.filter(file => relative(root, file).startsWith(candidatePrefix) && /\.test\.(?:tsx?|m?js)$/u.test(file));
  const candidateRoots = existsSync(resolve(root, 'test/ci21-candidate-ports.json')) ? read('test/ci21-candidate-ports.json').files.map(row => resolve(root, row.targetPath)) : [];
  assert(candidateRoots.every(file => relative(root, file).startsWith(candidatePrefix)), 'Candidate records may hold only the explicit candidate directory');
  const candidateSupport = existsSync(resolve(root, 'test/ci21-candidate-ports.json')) ? read('test/ci21-candidate-ports.json').files.flatMap(row => row.compilerSupport ?? []) : [];
  assert(candidateSupport.every(file => /^test\/fixtures\/headless\/[a-z][a-z0-9-]*\.ts$/u.test(file) && existsSync(resolve(root,file))), 'Candidate native children must be explicit maintained fixture modules');

  assert.deepEqual([...candidateRoots].sort(), [...candidateTests].sort(), 'Every candidate case must have retained compiler admission');
  if (candidateRoots.length > 0) {
    const config = ts.createSourceFile('vitest.config.ts', readFileSync(resolve(root, 'vitest.config.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
    let excluded = false;
    function visit(node) {
      if (ts.isPropertyAssignment(node) && node.name.getText(config) === 'test' && ts.isObjectLiteralExpression(node.initializer)) {
        for (const property of node.initializer.properties) if (ts.isPropertyAssignment(property) && property.name.getText(config) === 'exclude' && ts.isArrayLiteralExpression(property.initializer))
          excluded ||= property.initializer.elements.some(value => ts.isStringLiteral(value) && value.text === 'test/ci21-candidate/**');
      }
      ts.forEachChild(node, visit);
    }
    visit(config); assert(excluded, 'Source candidates must remain excluded from default discovery until publication');
  }
  const rewardPrefix = 'test/reward-candidate/';
  const rewardRoots = existsSync(resolve(root, 'test/reward-candidate.json')) ? read('test/reward-candidate.json').files.map(file => resolve(root, file)) : [];
  assert(rewardRoots.every(file => relative(root,file).startsWith(rewardPrefix)), 'Reward candidates must stay in their explicit directory');
  assert.deepEqual([...rewardRoots].sort(), files.filter(file => relative(root,file).startsWith(rewardPrefix) && /\.test\.mjs$/u.test(file)).sort(), 'Every reward candidate must be declared');
  function localFile(file, specifier) {
    if (!specifier.startsWith('.')) return undefined;
    const target = ts.resolveModuleName(specifier.split('?')[0], file,
      { moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true }, ts.sys).resolvedModule?.resolvedFileName;
    return target !== undefined && imports.has(target) ? target : undefined;
  }
  function reachable(roots) {
    const found = new Set(), queue = [...roots];
    while (queue.length) {
      const file = queue.pop(); if (found.has(file)) continue;
      found.add(file);
      for (const specifier of imports.get(file) ?? []) { const next = localFile(file, specifier); if (next !== undefined) queue.push(next); }
    }
    return found;
  }
  const defaults = reachable([...files.filter(file => {
      const name = relative(root, file), helper = name.startsWith('test/fixtures/') || name.startsWith('test/fake/') || name.startsWith('test/proof/') || name.startsWith(candidatePrefix) || name.startsWith(rewardPrefix);
      return !helper || /\.test\.(?:tsx?|m?js)$/u.test(file) && !name.startsWith(candidatePrefix) && !name.startsWith(rewardPrefix);
    }),
    ...(read('test/tsconfig.json').files ?? []).map(file => resolve(root, 'test', file)),
    // These existing normal proofs execute their observation module through a
    // variable import/native child; keep their roots explicit and conservative.
    resolve(root, 'test/fixtures/spruce-author-observation.ts'),
    resolve(root, 'test/fixtures/nalati-ambient-observation.ts')]);
  const rewardOnly = reachable(rewardRoots);
  const candidateOnly = new Set([...reachable([...candidateRoots,...candidateSupport.map(file => resolve(root,file)),...rewardRoots])].filter(file => !defaults.has(file)));
  for (const file of checked) for (const specifier of imports.get(file)) {
    if (specifier.startsWith('@wildshard/engine/') && (candidate || rewards && rewardOnly.has(file) || !candidateOnly.has(file))) {
      try { createRequire(file).resolve(specifier); }
      catch { problems.push(`${relative(root, file)}: engine does not export ${specifier}`); }
    }
    if (!specifier.startsWith('.')) continue;
    const absolute = resolve(dirname(file), specifier), target = relative(sourceRoot, absolute);
    if (absolute.includes('/src/shards/') && (target.startsWith('..') || !owned.has(target.split('/')[0]))) problems.push(`${relative(root, file)}: imports another shard: ${specifier}`);
    const origin = relative(sourceRoot, file);
    if (!origin.startsWith('..') && !target.startsWith('..') && origin.split('/')[0] !== target.split('/')[0]) problems.push(`${relative(root, file)}: imports another shard: ${specifier}`);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
  return { candidateOnly: candidateOnly.size };
}
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = checkTestBoundary('.', { candidate: process.argv.includes('--candidate'), rewards: process.argv.includes('--rewards') });
  console.log(`Cleared queue and installed engine exports verified; ${result.candidateOnly} source-only files require the candidate gate`);
}
