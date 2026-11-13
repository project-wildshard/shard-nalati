// The model record Nalati's places bake reads (SA6): a catalogue model's id, its defaults and variants, and an offline build
// marker (painted or generated). The bake never invokes a build; the live builder belongs to the declared host.

/** One model as the places bake sees it. */
export interface ModelSource<P extends object> {
  readonly id: string;
  /** a copy's params when its placement sets none (and the Explorer specimen's) */
  readonly defaults: P;
  readonly variants?: readonly { readonly id: string; readonly params: Partial<P> }[] | undefined;
  /** the painted or generated marker; never called here */
  readonly build: (...args: never[]) => unknown;
}

/** A copy's params: the defaults, then its variant's, then its own. */
export function paramsOf<P extends object>(def: ModelSource<P>, variant: string | undefined, own: Partial<P> | undefined): P {
  const v = variant === undefined ? undefined : def.variants?.find((x) => x.id === variant);
  if (v === undefined && own === undefined) return def.defaults;
  return { ...def.defaults, ...v?.params, ...own };
}
