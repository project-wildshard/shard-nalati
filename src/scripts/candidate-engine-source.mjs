// Where the installed candidate engine came from, read from pnpm-lock.yaml. pnpm 10's `pnpm list --json` names no
// `resolved` for a git dependency, so Nalati CI 46047262385 compared undefined with the codeload URL and went red. The
// lockfile's own resolution is the record: a codeload tarball, or a git commit of project-wildshard/engine.
const CODELOAD = 'https://codeload.github.com/project-wildshard/engine/tar.gz/';

/** Every `@wildshard/engine` package the lockfile resolves, as a codeload URL, `git:<repo>#<commit>` or `registry`. */
export function lockedEngineSources(lockText) {
  const sources = new Set();
  for (const [, body] of lockText.matchAll(/^ {2}'?@wildshard\/engine@[^\n]*:\n {4}resolution: \{([^}\n]*)\}/gmu)) {
    const field = name => new RegExp(`(?:^|, )${name}: ([^,]+)`, 'u').exec(body)?.[1]?.trim();
    const tarball = field('tarball'), commit = field('commit'), repo = field('repo');
    if (tarball !== undefined) sources.add(tarball);
    else if (commit !== undefined) {
      sources.add(/[/:]project-wildshard\/engine(?:\.git)?$/u.test(repo ?? '') ? `${CODELOAD}${commit}` : `git:${repo}#${commit}`);
    } else sources.add('registry');
  }
  return [...sources];
}

/** The one engine source the lockfile installs; refuses none or several (a registry copy beside the candidate). */
export function lockedEngineSource(lockText) {
  const sources = lockedEngineSources(lockText);
  if (sources.length !== 1) throw new Error(`pnpm-lock.yaml resolves ${sources.length} @wildshard/engine sources: ${sources.join(', ') || 'none'}`);
  return sources[0];
}
