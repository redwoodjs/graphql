import { vi } from 'vitest'

// Note: @envelop/testing appears to require jest to be defined, even though they take no
// dependency or peer-dependency on it. This is a hacky workaround to make it work with vitest.
// We should ask the Guild about this...
// @ts-expect-error Figure this type error out when we totally remove jest
globalThis.jest = vi
