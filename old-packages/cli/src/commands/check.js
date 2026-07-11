import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { getPaths } from '../lib'
import c from '../lib/colors'

export const command = 'check'
export const aliases = ['diagnostics']
export const description =
  'Get structural diagnostics for a Redwood project (experimental)'

export const handler = () => {
  recordTelemetryAttributes({
    command: 'check',
  })
  // Deep dive
  //
  // It seems like we have to use `require` here instead of `await import`
  // because of how Babel builds the `DiagnosticSeverity` export in `@redwoodjs/structure`:
  //
  // ```js
  // _Object$defineProperty(exports, "DiagnosticSeverity", {
  //   enumerable: true,
  //   get: function () {
  //     return _vscodeLanguageserverTypes.DiagnosticSeverity;
  //   }
  // });
  // ```
  //
  // I'm not sure why, but with `await import`, `DiagnosticSeverity` is `undefined`
  // so it seems like `await import` doesn't execute the getter function.
  const {
    printDiagnostics,
    DiagnosticSeverity,
  } = require('@redwoodjs/structure')

  printDiagnostics(getPaths().base, {
    getSeverityLabel: (severity) => {
      if (severity === DiagnosticSeverity.Error) {
        return c.error('error')
      }
      if (severity === DiagnosticSeverity.Warning) {
        return c.warning('warning')
      }
      return c.info('info')
    },
  })
}
