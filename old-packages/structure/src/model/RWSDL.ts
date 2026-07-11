import { basename } from 'path'

import { Kind } from 'graphql'
import { parse as parseGraphQL } from 'graphql/language/parser'
import * as tsm from 'ts-morph'

import { RWError } from '../errors'
import { FileNode } from '../ide'
import { iter } from '../x/Array'
import { lazy } from '../x/decorators'
import { err } from '../x/vscode-languageserver-types'

import type { RWProject } from './RWProject'
import { RWSDLField } from './RWSDLField'

export class RWSDL extends FileNode {
  constructor(
    public filePath: string,
    public parent: RWProject,
  ) {
    super()
  }
  /**
   * The Template Literal node (string) that contains the schema
   */
  @lazy() get schemaStringNode() {
    const i = this.sf.getVariableDeclaration('schema')?.getInitializer()
    if (!i) {
      return undefined
    }
    // TODO: do we allow other kinds of strings? or just tagged literals?
    if (tsm.Node.isTaggedTemplateExpression(i)) {
      const t = i.getTemplate() //?
      if (tsm.Node.isNoSubstitutionTemplateLiteral(t)) {
        return t
      }
    }
    return undefined
  }
  @lazy() get schemaString(): string | undefined {
    return this.schemaStringNode?.getLiteralText()
  }
  @lazy() get serviceFilePath() {
    return this.parent.servicesFilePath(this.name)
  }
  @lazy() get service() {
    return this.parent.services.find((s) => s.name === this.name)
  }
  @lazy() get name() {
    // TODO: support TS
    const base = basename(this.filePath)
    return base.substr(0, base.length - '.sdl.js'.length)
  }
  @lazy() get implementableFields() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return iter(function* () {
      if (!self.schemaString) {
        return
      } //?
      const ast = parseGraphQL(self.schemaString)
      for (const def of ast.definitions) {
        if (def.kind === Kind.OBJECT_TYPE_DEFINITION) {
          if (def.name.value === 'Query' || def.name.value === 'Mutation') {
            for (const field of def.fields ?? []) {
              yield new RWSDLField(def, field, self)
            }
          }
        }
      }
    })
  }

  children() {
    return [...this.implementableFields]
  }
  *diagnostics() {
    if (!this.schemaStringNode) {
      yield err(
        this.uri,
        "Each SDL file must export a variable named 'schema' with a GraphQL schema string",
        RWError.SCHEMA_NOT_DEFINED,
      )
    }
  }
}
