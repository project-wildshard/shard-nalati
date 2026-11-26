import { AGENT_HEADER, agentUserAgent } from './wildshard-agent-requests.mjs';

// No sound from agent browsers, ever (meta QA 11-25 row 140; Jake, 2026-11-24: "NEVER FUCKING SOUND SOUND OFF"). Every
// browser this marker starts is silenced twice over, as engine's own launcher is (engine src/scripts/browser-silence.mjs,
// the same code):
//   - a Chromium start always passes --mute-audio, whatever args the caller gave;
//   - every context and page, in Chromium, WebKit and Firefox alike, runs `silencePage` before the page's own script:
//     Web Audio plays into a zero gain in front of the real speakers, and every media element is muted.
// WebKit and Firefox have no mute switch, so the page side is what keeps them quiet.
export const MUTE_ARG = '--mute-audio';

/** Runs inside the page, before its own script; it must not close over anything. Web Audio keeps its clock and graph
 * (a game that waits on `currentTime` or a `running` state behaves as for a player), but `destination` is a gain of 0
 * wired to the real speakers. Media elements are muted on play and cannot be unmuted. */
export function silencePage() {
  const scope = /** @type {any} */ (globalThis);
  const base = scope.BaseAudioContext?.prototype ?? scope.AudioContext?.prototype ?? scope.webkitAudioContext?.prototype;
  const destination = base === undefined ? undefined : Object.getOwnPropertyDescriptor(base, 'destination');
  if (destination?.get !== undefined && base.__wildshardSilenced !== true) {
    const sinks = new WeakMap();
    Object.defineProperty(base, '__wildshardSilenced', { value: true });
    Object.defineProperty(base, 'destination', {
      configurable: true,
      enumerable: true,
      get() {
        const speakers = destination.get?.call(this);
        // Rendering to a buffer makes no sound, and the buffer must keep what was rendered.
        if (scope.OfflineAudioContext !== undefined && this instanceof scope.OfflineAudioContext) return speakers;
        let sink = sinks.get(this);
        if (sink === undefined) {
          sink = this.createGain();
          sink.gain.value = 0;
          // Reflect.apply, not a method call: the kit's keychain check reads `.connect(` as a CDP attachment.
          Reflect.apply(sink.connect, sink, [speakers]);
          sinks.set(this, sink);
        }
        return sink;
      },
    });
  }
  const media = scope.HTMLMediaElement?.prototype;
  const muted = media === undefined ? undefined : Object.getOwnPropertyDescriptor(media, 'muted');
  if (media !== undefined && muted?.set !== undefined && media.__wildshardSilenced !== true) {
    const mute = (/** @type {unknown} */ element) => muted.set?.call(element, true);
    Object.defineProperty(media, '__wildshardSilenced', { value: true });
    Object.defineProperty(media, 'muted', { configurable: true, enumerable: true, get() { return muted.get?.call(this); }, set() { mute(this); } });
    const original = media.play;
    media.play = function play(/** @type {unknown[]} */ ...args) {
      mute(this);
      return original.apply(this, args);
    };
    // An autoplay element starts without a play() call.
    scope.addEventListener?.('play', (/** @type {Event} */ event) => mute(event.target), true);
  }
}

/** Silence a context or page before its own script runs; anything without `addInitScript` passes through.
 * @template T @param {T} target @returns {Promise<T>} */
export async function silenced(target) {
  const own = /** @type {{ addInitScript?: (script: () => void) => Promise<void> } | null | undefined} */ (target);
  if (typeof own?.addInitScript === 'function') await own.addInitScript(silencePage);
  return target;
}

/** Launch options for a Chromium start, with --mute-audio added when the caller left it out.
 * @template {{ args?: string[] }} Options @param {Options | undefined} options @returns {Options} */
export function mutedLaunch(options) {
  const args = options?.args ?? [];
  return /** @type {Options} */ ({ ...options, args: args.includes(MUTE_ARG) ? args : [...args, MUTE_ARG] });
}

const browsers = new WeakSet();
const engines = new WeakSet();

// Production is humans only (J205, J209; meta QA 11-25 row 124): a marked browser stops at prod's title.
//   - a Chromium start can't resolve the production rooms host, whoever drives it (agent-browser over CDP included);
//   - a page's `goto` refuses a production game URL other than the bare title (`/`, with only `agent`, `mute`,
//     `nolock` or `sw` in its query); once it opens prod, its context aborts navigations past the title and requests
//     to the rooms host, and closes sockets to it. The routes go in only then: Playwright routing turns the HTTP
//     cache off. Engine's own copy is engine `src/scripts/browser-prod-guard.mjs`.
const PROD_PAGE_HOST = 'play.wildshard.io';
const PROD_ROOMS_HOST = 'rooms.wildshard.io';
const RESOLVER = '--host-resolver-rules=';
export const PROD_ROOMS_BLOCK = `${RESOLVER}MAP ${PROD_ROOMS_HOST} ~NOTFOUND`;
const TITLE_WORDS = new Set(['agent', 'mute', 'nolock', 'sw']);
const TITLE_PATHS = new Set(['/', '/index.html']);
const REFUSED = 'production is humans only (J205): agents may open the bare title page of play.wildshard.io, never join';

/** @param {string | URL} url */
function hostOf(url) {
  try { return new URL(String(url)).hostname.toLowerCase().replace(/\.$/u, ''); } catch { return ''; }
}

/** Why an agent may not open this URL, or undefined. @param {string | URL} url @returns {string | undefined} */
export function prodNavigationRefusal(url) {
  const host = hostOf(url);
  if (host === PROD_ROOMS_HOST) return `${REFUSED}: ${PROD_ROOMS_HOST} is refused`;
  if (host !== PROD_PAGE_HOST) return undefined;
  const at = new URL(String(url)), extra = [...at.searchParams.keys()].filter(word => !TITLE_WORDS.has(word));
  return TITLE_PATHS.has(at.pathname) && extra.length === 0 ? undefined : `${REFUSED}: ${at.pathname} is past the title`;
}

/** Chromium args with the rooms host unresolvable, merged into a caller's own resolver rule. @param {readonly string[]} args */
export function withProdBlock(args) {
  const rule = PROD_ROOMS_BLOCK.slice(RESOLVER.length), index = args.findIndex(arg => arg.startsWith(RESOLVER));
  if (index < 0) return [...args, PROD_ROOMS_BLOCK];
  const own = args[index] ?? RESOLVER;
  return own.includes(rule) ? [...args] : args.map((arg, at) => at === index ? `${own}, ${rule}` : arg);
}

const routed = new WeakSet();
/** @param {any} context */
async function guardProdRoutes(context) {
  if (routed.has(context) || typeof context?.route !== 'function') return;
  routed.add(context);
  const prod = (/** @type {URL} */ url) => [PROD_PAGE_HOST, PROD_ROOMS_HOST].includes(hostOf(url));
  await context.route(prod, async (/** @type {any} */ route) => {
    const request = route.request(), url = request.url();
    if (hostOf(url) === PROD_ROOMS_HOST || (request.isNavigationRequest() && prodNavigationRefusal(url) !== undefined)) {
      await route.abort('blockedbyclient');
    } else await route.fallback();
  });
  await context.routeWebSocket?.((/** @type {URL} */ url) => hostOf(url) === PROD_ROOMS_HOST,
    async (/** @type {any} */ socket) => { await socket.close({ code: 1008, reason: 'J205' }); });
}

const pages = new WeakSet();
/** @template T @param {T} page @returns {T} */
function guardPage(page) {
  const own = /** @type {any} */ (page);
  if (typeof own?.goto !== 'function' || pages.has(own)) return page;
  pages.add(own);
  const goto = own.goto.bind(own);
  own.goto = async (/** @type {string} */ url, /** @type {unknown} */ options) => {
    const why = prodNavigationRefusal(url);
    if (why !== undefined) throw new Error(`wildshard-browser-marker refused ${url}: ${why}`);
    if ([PROD_PAGE_HOST, PROD_ROOMS_HOST].includes(hostOf(url))) await guardProdRoutes(own.context?.());
    return goto(url, options);
  };
  return page;
}

/** A page, or a context's pages now and later, stop at prod's title. @template T @param {T} target @returns {T} */
export function prodGuarded(target) {
  const own = /** @type {any} */ (target);
  if (typeof own?.goto === 'function') return guardPage(target);
  if (typeof own?.on === 'function' && typeof own?.pages === 'function') {
    for (const page of own.pages()) guardPage(page);
    own.on('page', guardPage);
  }
  return target;
}

/** @template {import('playwright').BrowserContextOptions} Options @param {Options} [options] */
function markedContext(options) {
  const headers = options?.extraHTTPHeaders;
  return {
    ...options,
    ...(headers === undefined ? {} : {
      extraHTTPHeaders: Object.fromEntries(Object.entries(headers).filter(([key]) => key.toLowerCase() !== AGENT_HEADER)),
    }),
    ...(options?.userAgent === undefined ? {} : { userAgent: agentUserAgent(options.userAgent) }),
  };
}

/** Keep the engine's default network UA when the caller did not specify a device.
 * The app reads this suffix and carries its actor marker to the room.
 * @template {import('playwright').BrowserContext | import('playwright').Page} Target
 * @param {Target} target @param {string | undefined} userAgent @returns {Promise<Target>}
 */
async function markDefaultUA(target, userAgent) {
  if (userAgent === undefined) {
    await target.addInitScript((suffix) => {
      const base = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: `${base} ${suffix}` });
    }, agentUserAgent(''));
  }
  return target;
}

/** @param {import('playwright').Browser} browser */
function markedBrowser(browser) {
  if (browsers.has(browser)) return browser;
  browsers.add(browser);
  const context = browser.newContext.bind(browser), page = browser.newPage.bind(browser);
  browser.newContext = async options => prodGuarded(await silenced(await markDefaultUA(await context(markedContext(options)), options?.userAgent)));
  browser.newPage = async options => prodGuarded(await silenced(await markDefaultUA(await page(markedContext(options)), options?.userAgent)));
  return browser;
}

/** @param {object} playwright */
export function installBrowserActorMarker(playwright) {
  for (const name of ['chromium', 'webkit', 'firefox']) {
    const engine = /** @type {import('playwright').BrowserType|undefined} */ (Reflect.get(playwright, name));
    if (engine === undefined || engines.has(engine)) continue;
    engines.add(engine);
    const chromium = name === 'chromium';
    /** @template {{ args?: string[] } | undefined} Options @param {Options} options */
    const blocked = options => chromium ? { ...options, args: withProdBlock(mutedLaunch(options).args ?? []) } : options;
    for (const method of ['launch', 'connect', 'connectOverCDP']) {
      const open = Reflect.get(engine, method);
      if (typeof open !== 'function') continue;
      /** @param {...unknown} args */
      const launch = async (...args) => markedBrowser(await Reflect.apply(open, engine,
        method === 'launch' ? [blocked(/** @type {{ args?: string[] } | undefined} */ (args[0])), ...args.slice(1)] : args));
      Reflect.set(engine, method, launch);
    }
    if (typeof engine.launchPersistentContext === 'function') {
      const persistent = engine.launchPersistentContext.bind(engine);
      engine.launchPersistentContext = async (dir, options) => prodGuarded(await silenced(await markDefaultUA(await persistent(dir, markedContext(blocked(options))), options?.userAgent)));
    }
  }
}
