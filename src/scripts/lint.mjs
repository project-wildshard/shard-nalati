// Run each complete owning lint gate. The shared commit hook appends staged
// src/ and kit/ paths; forwarding them through a shell chain sends them to
// its final command under the wrong compiler/rules. Each gate already names
// its complete source set, so staged selection never changes its admission.
import { spawnSync } from 'node:child_process';
for (const script of ['lint:shards', 'lint:ci21']) {
  const result = spawnSync('pnpm', ['run', script], { stdio: 'inherit' });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
