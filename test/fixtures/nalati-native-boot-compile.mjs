import { nalatiNativeBootInputs } from './nalati-native-boot-inputs.ts';
import { encodeCanonicalJson } from '@wildshard/engine/host/immutable';

console.log(encodeCanonicalJson(nalatiNativeBootInputs()));
