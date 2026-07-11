import { pathToFileURL } from 'node:url'

// TODO(jgmw): Refactor and move this into `@redwoodjs/project-config` or similar
export function makeFilePath(path: string) {
  return pathToFileURL(path).href
}
