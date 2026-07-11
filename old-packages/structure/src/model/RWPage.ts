import { dirname } from 'path'

import * as tsm from 'ts-morph'

import { FileNode } from '../ide'
import { lazy } from '../x/decorators'

import type { RWProject } from './RWProject'

export class RWPage extends FileNode {
  constructor(
    public constName: string,
    public path: string,
    public parent: RWProject,
  ) {
    super()
  }
  @lazy() get filePath() {
    return this.path
  }
  @lazy() get route() {
    return this.parent.router.routes.find(
      (r) => r.page_identifier_str === this.constName,
    )
  }
  @lazy() get layoutName(): string | undefined {
    const candidates = this.parent.layouts.map((l) => l.basenameNoExt)
    if (candidates.length === 0) {
      return undefined
    }
    for (const tag of this.sf.getDescendantsOfKind(
      tsm.SyntaxKind.JsxOpeningElement,
    )) {
      const t = tag.getTagNameNode().getText() //?
      if (candidates.includes(t)) {
        return t
      }
    }
    return undefined
  }
  @lazy() get actionRemove() {
    const edits = new Map<any, any>()
    // delete directory (MyPage/...)
    edits.set(dirname(this.filePath), undefined)
    // removing a page also removes its route
    if (this.route) {
      edits.set(this.route.jsxNode, undefined)
    }
    // TODO: we need to transform this edits map to a standard edits map (with locations)
    return edits
  }
}
