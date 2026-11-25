// Retain complete original direct cases, including fixed native journey suites.
import ts from '@typescript/typescript6';

export function caseInventory(text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const imported = new Set(), constants = new Map(), titles = [];
  function root(node) {
    if (ts.isIdentifier(node)) return ['test', 'it', 'describe'].includes(node.text) ? node.text : null;
    if (ts.isPropertyAccessExpression(node)) return root(node.expression);
    return ts.isCallExpression(node) ? root(node.expression) : null;
  }
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === 'vitest') {
      const names = statement.importClause?.namedBindings;
      if (names !== undefined && ts.isNamedImports(names)) for (const entry of names.elements) {
        const name = entry.propertyName?.text ?? entry.name.text;
        if (['test', 'it', 'describe'].includes(name)) {
          if (name === 'it' || entry.name.text !== name) throw new Error('CI21 requires direct unaliased test/describe imports');
          imported.add(name);
        }
      }
    }
    if (ts.isVariableStatement(statement) && (statement.declarationList.flags & ts.NodeFlags.Const) !== 0)
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined && ts.isStringLiteral(declaration.initializer))
          constants.set(declaration.name.text, declaration.initializer.text);
  }
  function title(node) {
    if (node !== undefined && ts.isStringLiteralLike(node)) return node.text;
    if (node !== undefined && ts.isTemplateExpression(node)) {
      let value = node.head.text;
      for (const span of node.templateSpans) {
        if (!ts.isIdentifier(span.expression) || !constants.has(span.expression.text)) throw new Error('CI21 case titles require fixed original constants');
        value += constants.get(span.expression.text) + span.literal.text;
      }
      return value;
    }
    throw new Error('CI21 case titles must be statically complete');
  }
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined && root(node.initializer) !== null)
      throw new Error('CI21 case aliases refuse');
    if (ts.isCallExpression(node) && root(node.expression) !== null) {
      if (!ts.isIdentifier(node.expression) || !imported.has(node.expression.text) ||
          !node.arguments.some(body => ts.isArrowFunction(body) || ts.isFunctionExpression(body)))
        throw new Error('CI21 cases and suites must run directly without modifiers');
      const name = title(node.arguments[0]);
      if (node.expression.text === 'test') titles.push(name);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (titles.length === 0 || new Set(titles).size !== titles.length) throw new Error('CI21 requires a nonempty unique original case inventory');
  return titles;
}
