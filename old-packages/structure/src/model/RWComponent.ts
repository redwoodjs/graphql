import * as tsm from 'ts-morph'

import { FileNode } from '../ide'
import { lazy } from '../x/decorators'

import type { RWProject } from './RWProject'

export class RWComponent extends FileNode {
  constructor(
    public filePath: string,
    public parent: RWProject,
  ) {
    super()
  }

  @lazy() get hasDefaultExport(): boolean {
    // TODO: Is this enough to test a default export?
    return (
      this.sf.getDescendantsOfKind(tsm.SyntaxKind.ExportAssignment).length > 0
    )
  }

  @lazy() get stories() {
    // TODO: this is a placeholder
    // we could list all the (storybook) stories related to this component here
    return []
  }

  @lazy() get exportedSymbols() {
    // KLUDGE!
    const ss = new Set<string>()
    for (const d of this.sf.getDescendantsOfKind(
      tsm.SyntaxKind.VariableDeclaration,
    )) {
      if (d.isExported()) {
        ss.add(d.getName())
      }
    }
    return ss
  }
}
