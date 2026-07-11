import { debounce, memo } from '../x/decorators'
import { ExtendedDiagnostic_groupByUri } from '../x/vscode-languageserver-types'

import type { RWLanguageServer } from './RWLanguageServer'

const REFRESH_DIAGNOSTICS_INTERVAL = 5000
const REFRESH_DIAGNOSTICS_DEBOUNCE = 500

export class DiagnosticsManager {
  constructor(public server: RWLanguageServer) {}

  @memo() start() {
    setInterval(() => this.refreshDiagnostics(), REFRESH_DIAGNOSTICS_INTERVAL)
    // The content of a text document has changed. This event is emitted
    // when the text document first opened or when its content has changed.
    const { documents, connection } = this.server
    documents.onDidChangeContent(() => {
      this.refreshDiagnostics()
    })
    connection.onDidChangeWatchedFiles(() => {
      this.refreshDiagnostics()
    })
  }

  // we need to keep track of URIs so we can "erase" previous diagnostics
  private previousURIs: string[] = []

  @debounce(REFRESH_DIAGNOSTICS_DEBOUNCE)
  private async refreshDiagnostics() {
    const dss = await this.getDiagnosticsGroupedByUri()
    const newURIs = Object.keys(dss)
    const allURIs = newURIs.concat(this.previousURIs)
    this.previousURIs = newURIs
    for (const uri of allURIs) {
      const diagnostics = dss[uri] ?? []
      this.server.connection.sendDiagnostics({ uri, diagnostics })
    }
  }

  private async getDiagnosticsGroupedByUri() {
    const project = this.server.getProject()
    if (!project) {
      return {}
    }
    const ds = await project.collectDiagnostics()
    return ExtendedDiagnostic_groupByUri(ds)
  }
}
