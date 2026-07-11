import type {
  FieldDefinitionNode,
  ObjectTypeDefinitionNode,
} from 'graphql/language/ast'
import type { CodeAction, Location } from 'vscode-languageserver-types'
import {
  DiagnosticSeverity,
  Position,
  WorkspaceChange,
} from 'vscode-languageserver-types'

import { RWError } from '../errors'
import type { Implementation } from '../ide'
import { BaseNode } from '../ide'
import { lazy } from '../x/decorators'
import { URL_file } from '../x/URL'
import type { ExtendedDiagnostic } from '../x/vscode-languageserver-types'
import {
  Location_fromNode,
  Position_fromTSMorphOffset,
} from '../x/vscode-languageserver-types'

import type { RWSDL } from './RWSDL'
import type { RWServiceFunction } from './RWServiceFunction'

export class RWSDLField extends BaseNode {
  constructor(
    public objectTypeDef: ObjectTypeDefinitionNode,
    public field: FieldDefinitionNode,
    public parent: RWSDL,
  ) {
    super()
  }
  @lazy() get id() {
    return (
      this.parent.id + ' ' + this.objectTypeDef.name.value + '.' + this.name
    )
  }
  /**
   * The location of this field.
   * Calculating this is slightly complicated since it is embedded within a TaggedTemplateLiteral
   */
  @lazy() get location(): Location {
    let { start, end } = this.field.loc!
    const node = this.parent.schemaStringNode!
    start += node.getPos() + 1 // we add one to account for the quote (`)
    end += node.getPos() + 1
    const startPos = Position_fromTSMorphOffset(start, node.getSourceFile())
    const endPos = Position_fromTSMorphOffset(end, node.getSourceFile())
    return { uri: this.parent.uri, range: { start: startPos, end: endPos } }
  }
  @lazy() get name() {
    return this.field.name.value
  }
  @lazy() get argumentNames() {
    return (this.field.arguments ?? []).map((a) => a.name.value)
  }
  *ideInfo() {
    if (this.impl) {
      yield {
        kind: 'Implementation',
        location: this.location,
        target: Location_fromNode(this.impl.node),
      } as Implementation
    }
  }
  /**
   * TODO: describe in prose what is going on here.
   * this is an important rule
   */
  @lazy() get impl(): RWServiceFunction | undefined {
    return (this.parent.service?.funcs ?? []).find((f) => f.name === this.name)
  }
  // TODO: improve snippet
  @lazy() private get defaultImplSnippet(): string {
    const args = this.field.arguments ?? []
    const params = args.map((a) => a.name.value).join(',')
    return `
export const ${this.field.name.value} = ({${params}}) => {
  // TODO: implement
}`
  }

  @lazy() get quickFix_addImplementation(): CodeAction {
    const { service } = this.parent
    const change = new WorkspaceChange({ documentChanges: [] })
    let insertPosition = Position.create(0, 0)
    let uri = URL_file(this.parent.serviceFilePath)
    if (service) {
      // we'll insert into the end of an existing file
      const lastLine = service.sf.getEndLineNumber()
      insertPosition = Position.create(lastLine, 0)
      uri = service.uri
    } else {
      // file doesn't exist
      // create the service file before inserting
      change.createFile(uri)
    }
    // insert
    change
      .getTextEditChange({ uri, version: null })
      .insert(insertPosition, this.defaultImplSnippet)
    return {
      title: 'Add implementation',
      edit: change.edit,
    } as CodeAction
  }

  *diagnostics() {
    if (!this.impl) {
      const { uri, range } = this.location
      yield {
        uri,
        diagnostic: {
          range,
          message: 'Service Not Implemented',
          severity: DiagnosticSeverity.Error,
          code: RWError.SERVICE_NOT_IMPLEMENTED,
        },
        quickFix: async () => this.quickFix_addImplementation,
      } as ExtendedDiagnostic
    }
  }
}
