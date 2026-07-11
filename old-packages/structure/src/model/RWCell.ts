import { Kind, parse as parseGraphQL } from 'graphql'
import * as tsm from 'ts-morph'
import { DiagnosticSeverity } from 'vscode-languageserver-types'

import { lazy } from '../x/decorators'
import { err, Range_fromNode } from '../x/vscode-languageserver-types'

import { RWComponent } from './RWComponent'

export class RWCell extends RWComponent {
  /**
   * A "Cell" is a component that ends in `Cell.{js, jsx, tsx}`, has no
   * default export AND exports `QUERY`
   **/
  @lazy() get isCell() {
    return !this.hasDefaultExport && this.exportedSymbols.has('QUERY')
  }

  // TODO: Move to RWCellQuery
  @lazy() get queryStringNode() {
    const i = this.sf.getVariableDeclaration('QUERY')?.getInitializer()
    if (!i) {
      return undefined
    }
    // TODO: do we allow other kinds of strings? or just tagged literals?
    if (tsm.Node.isTaggedTemplateExpression(i)) {
      const t = i.getTemplate()
      if (tsm.Node.isNoSubstitutionTemplateLiteral(t)) {
        return t
      }
    }
    return undefined
  }

  // TODO: Move to RWCellQuery
  @lazy() get queryString(): string | undefined {
    return this.queryStringNode?.getLiteralText()
  }

  // TODO: Move to RWCellQuery
  @lazy() get queryAst() {
    const qs = this.queryString
    if (!qs) {
      return undefined
    }

    try {
      return parseGraphQL(qs)
    } catch (e) {
      console.error("Can't parse the graphql query string in", this.filePath)
      console.error(e)
      return undefined
    }
  }

  // TODO: Move to RWCellQuery
  @lazy() get queryOperationName(): string | undefined {
    const ast = this.queryAst
    if (!ast) {
      return undefined
    }
    for (const def of ast.definitions) {
      if (def.kind == Kind.OPERATION_DEFINITION) {
        return def?.name?.value
      }
    }
    return undefined
  }

  *diagnostics() {
    // check that QUERY and Success are exported
    if (!this.exportedSymbols.has('QUERY')) {
      yield err(
        this.uri,
        'Every Cell MUST export a QUERY variable (GraphQL query string)',
      )
    }

    try {
      if (!this.queryOperationName) {
        yield {
          uri: this.uri,
          diagnostic: {
            range: Range_fromNode(this.queryStringNode!),
            message: 'We recommend that you name your query operation',
            severity: DiagnosticSeverity.Warning,
          },
        }
      }
    } catch (e: any) {
      // Maybe the AST has a syntax error...
      yield {
        uri: this.uri,
        diagnostic: {
          // TODO: Try to figure out if we can point directly to the syntax error.
          range: Range_fromNode(this.sf.getVariableDeclaration('QUERY')!),
          message: e.message,
          severity: DiagnosticSeverity.Error,
        },
      }
    }

    // TODO: check that exported QUERY is semantically valid GraphQL (fields exist)
    if (!this.exportedSymbols.has('Success')) {
      yield err(
        this.uri,
        'Every Cell MUST export a Success variable (React Component)',
      )
    }
  }
}
