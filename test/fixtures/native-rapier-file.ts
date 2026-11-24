// The native proof resolves the installed engine's declared physics package through the SDK.
import { engineRequire as engine } from '@wildshard/sdk/headless';

export const nativeRapierFile = engine.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm');
