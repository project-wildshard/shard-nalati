// oxlint-disable-next-line import/no-nodejs-modules -- Native witness integrity reads the exact committed WASM bytes.
import { readFileSync } from 'node:fs';
import { NALATI_NIGHT } from './nalati-night';
import weatherOriginal from './nalati-weather-original.json';
import * as v from 'valibot';
import {WeatherReactionsSchema} from '@wildshard/format/weatherProgram';
import {DecisionScriptsSchema} from '@wildshard/format/decisionScripts';
import {sha256} from '@wildshard/engine/game/plugin/moduleHash';

const raw=v.parse(v.object({...WeatherReactionsSchema.entries,script:DecisionScriptsSchema.pipe[2].item}),
  weatherOriginal);
export const weatherModuleBytes=new Uint8Array(readFileSync(new URL('nalati-weather-original.wasm', import.meta.url)));
if(raw.script.module!==`blobs/wasm/${sha256(weatherModuleBytes)}.wasm`)throw new Error('Weather witness hash mismatch');
export const weatherRaw=raw;
export const weatherWitness={...raw,bytes:Buffer.from(weatherModuleBytes).toString('base64')};
export function withWeatherWitness<T extends {program:{script:{module:string};bytes:string}}>(row:T): T & {program:{script:{module:string};bytes:string}} {
  if(row.program.script.module!==raw.script.module)throw new Error('Night witness hash mismatch');
  return {...row,program:{...row.program,bytes:weatherWitness.bytes}};
}

export const nightParameters=v.parse(v.object({parameters:v.record(v.string(),v.number())}),
  structuredClone(NALATI_NIGHT)).parameters;
