import { makeFilePath } from './utils.js'

type SSRModuleMap = null | {
  [clientId: string]: {
    [clientExportName: string]: ClientReferenceManifestEntry
  }
}
type ClientReferenceManifestEntry = ImportManifestEntry
type ImportManifestEntry = {
  id: string
  // chunks is a double indexed array of chunkId / chunkFilename pairs
  chunks: string[]
  name: string
}

// This is passed in as `moduleMap`, but internally they call this
// `bundlerConfig`. `bundlerConfig` is accessed as an object where the keys are
// file paths. The values are "moduleExports" objects that have keys that
// correspond to React Component names, like AboutCounter.
export const moduleMap: SSRModuleMap = new Proxy(
  {},
  {
    get(_target, filePath: string) {
      // "moduleExports" proxy
      return new Proxy<Record<string, ClientReferenceManifestEntry>>(
        {},
        {
          get(_target, name: string) {
            filePath = makeFilePath(filePath)

            const manifestEntry: ClientReferenceManifestEntry = {
              id: filePath,
              chunks: [filePath],
              name,
            }

            return manifestEntry
          },
        },
      )
    },
  },
)
