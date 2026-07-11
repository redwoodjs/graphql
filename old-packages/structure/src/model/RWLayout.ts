import { FileNode } from '../ide'

import type { RWProject } from './RWProject'
/**
 * layouts live in the src/layouts folder
 */
export class RWLayout extends FileNode {
  constructor(
    public filePath: string,
    public parent: RWProject,
  ) {
    super()
  }
}
