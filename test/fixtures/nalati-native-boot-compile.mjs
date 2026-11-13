import { nalatiNativeBootInputs } from './nalati-native-boot-inputs.ts';
import { encodeCanonicalJson } from '@wildshard/format/immutable';

console.log(encodeCanonicalJson(nalatiNativeBootInputs()));
