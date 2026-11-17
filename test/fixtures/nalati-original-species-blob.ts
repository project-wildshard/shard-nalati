import { nameBlob, type BlobSourceOptions, type NamedBlob, type NamedBlobKind } from '@wildshard/sharddev/blobs';
import { originalSpeciesOutput } from './nalati-original-species';
import pins from './nalati-species-files.json' with { type: 'json' };

interface OriginalDeclaration {
  readonly name: string;
  readonly kind: NamedBlobKind;
  readonly source: string;
  readonly options?: BlobSourceOptions;
}

/** Only the five frozen historical species publications are source-built oracle inputs.
 * Other declarations retain their ordinary strict raw-file reader; no failed read falls back here. */
export function originalSpeciesBlob(row: OriginalDeclaration): NamedBlob | undefined {
  // Owner output declarations are now relative to the Nalati source root.
  // Admit only a retained exact historical path; never read an unpinned file.
  const paths = new Set([`src/${row.source}`, `src/shards/nalati-grasslands/${row.source}`]);
  const pin = pins.find(value => paths.has(value.path));
  if (pin === undefined) return undefined;
  return nameBlob(row.name, row.kind, originalSpeciesOutput(pin.path), row.options);
}
