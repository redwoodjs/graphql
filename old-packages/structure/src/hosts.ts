import fg from 'fast-glob'
import * as fs from 'fs-extra'

import type { Paths } from '@redwoodjs/project-config'
import { getPaths } from '@redwoodjs/project-config'

import { lazy } from './x/decorators'

/**
 * The host interface allows us to decouple the "model/*"
 * classes from access to the file system.
 * This is critical for editor support (ex: showing diagnostics on unsaved files)
 */
export interface Host {
  existsSync(path: string): boolean
  readFileSync(path: string): string
  readdirSync(path: string): string[]
  globSync(pattern: string): string[]
  writeFileSync(path: string, contents: string): void
  paths: Paths
}

export class DefaultHost implements Host {
  existsSync(path: string) {
    return fs.existsSync(path)
  }
  readFileSync(path: string) {
    return fs.readFileSync(path, { encoding: 'utf8' }).toString()
  }
  readdirSync(path: string) {
    return fs.readdirSync(path)
  }
  globSync(pattern: string) {
    // globSync only works with / as the path separator, even on Windows
    return fg.sync(pattern.replaceAll('\\', '/'))
  }
  writeFileSync(path: string, contents: string) {
    return fs.writeFileSync(path, contents)
  }
  @lazy()
  get paths() {
    return getPaths()
  }
}
