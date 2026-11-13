// CI policy at the package boundary, not an engine implementation contract.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, relative, dirname } from 'node:path';
import ts from '@typescript/typescript6';

const pending = JSON.parse(readFileSync('test/lift-pending.json', 'utf8'));
assert.deepEqual(pending, [], 'The cleared lift queue must stay empty; new coverage must run');
const root = resolve('.'), sourceRoot = resolve('src/shards'); // multi-shard only: a single-shard src/ has no other shard to import
const problems = [];
const owned = new Set((existsSync(sourceRoot) ? readdirSync(sourceRoot, { withFileTypes: true }) : []).filter(row => row.isDirectory()).map(row => row.name));
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const row of readdirSync(directory, { withFileTypes: true })) {
    const file = resolve(directory, row.name);
    if (row.isDirectory()) { walk(file); continue; }
    if (!/\.(?:ts|tsx|mjs|js)$/u.test(file)) continue;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function check(specifier) {
      if (specifier.startsWith('@wildshard/engine/')) {
        try { createRequire(file).resolve(specifier); }
        catch { problems.push(`${relative(root, file)}: engine does not export ${specifier}`); }
      }
      if (!specifier.startsWith('.')) return;
      const absolute = resolve(dirname(file), specifier);
      const target = relative(sourceRoot, absolute);
      if (absolute.includes('/src/shards/') && (target.startsWith('..') || !owned.has(target.split('/')[0])))
        problems.push(`${relative(root, file)}: imports another shard: ${specifier}`);
      const origin = relative(sourceRoot, file);
      if (!origin.startsWith('..') && !target.startsWith('..') && origin.split('/')[0] !== target.split('/')[0])
        problems.push(`${relative(root, file)}: imports another shard: ${specifier}`);
    }
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) check(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require') && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) check(node.arguments[0].text);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
walk(resolve('src')); walk(resolve('test'));
assert.deepEqual(problems, [], problems.join('\n'));
console.log('Cleared test queue and installed engine exports verified');
