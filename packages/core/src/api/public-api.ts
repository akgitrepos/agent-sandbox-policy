import type { AspVersion } from '../domain/primitives';

import { CORE_VERSION } from '../domain/version';

export interface AspRuntimeInfo {
  version: AspVersion;
}

export function getRuntimeInfo(): AspRuntimeInfo {
  return {
    version: CORE_VERSION,
  };
}
