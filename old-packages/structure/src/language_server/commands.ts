import type { ExecuteCommandOptions } from 'vscode-languageserver'

import { command_builder } from '../interactive_cli/command_builder'
import { redwood_gen_dry_run as dry_run } from '../interactive_cli/dry_run'
import { RedwoodCommandString } from '../interactive_cli/RedwoodCommandString'
import { VSCodeWindowUI } from '../interactive_cli/ui'
import { RWProject } from '../model'
import { lazy, memo } from '../x/decorators'
import { URL_toFile } from '../x/URL'
import {
  FileSet_fromTextDocuments,
  WorkspaceEdit_fromFileSet,
} from '../x/vscode-languageserver-types'

import type { RWLanguageServer } from './RWLanguageServer'

export const redwoodjs_commands = {
  'redwoodjs.cli': 'redwoodjs.cli',
}

export type CommandID = keyof typeof redwoodjs_commands

export class CommandsManager {
  constructor(public server: RWLanguageServer) {}

  @lazy() get options(): ExecuteCommandOptions {
    return {
      commands: Object.keys(redwoodjs_commands),
      workDoneProgress: true,
    }
  }

  @memo() start() {
    const { connection } = this.server
    connection.onExecuteCommand(async (params) => {
      if (params.command === redwoodjs_commands['redwoodjs.cli']) {
        const [cmd, cwd] = params.arguments ?? []
        await this.command__cli(cmd, cwd)
      }
    })
  }

  // --- start command implementations
  private async command__cli(cmdString?: string, cwd?: string) {
    const { vscodeWindowMethods, host, projectRoot, connection, documents } =
      this.server
    cwd = cwd ?? projectRoot
    if (!cwd) {
      return
    } // we need a cwd to run the CLI
    // parse the cmd. this will do some checks and throw
    let cmd = new RedwoodCommandString(cmdString ?? '...')

    if (
      cmd.processed.startsWith('dev --open') ||
      cmd.processed.startsWith('storybook --open')
    ) {
      vscodeWindowMethods.showInformationMessage(
        'not implemented yet: $ redwood ' + cmd.processed,
      )
      return
    }

    if (!cmd.isComplete) {
      // if the command is incomplete, we need to build it interactively
      const project = new RWProject({ projectRoot: cwd, host })
      // the interactive builder needs a UI to prompt the user
      // this UI is provided by the client side VSCode extension
      // (it is not a standard part of the LSP)
      // we have a convenience wrapper to access it
      const ui = new VSCodeWindowUI(vscodeWindowMethods)
      const cmd2 = await command_builder({ cmd, project, ui })
      if (!cmd2) {
        return
      } // user cancelled the interactive process
      cmd = cmd2
    }
    // run the command
    if (cmd.isInterceptable) {
      // TODO: we could use the LSP progress API
      vscodeWindowMethods.showInformationMessage('redwood ' + cmd.processed)
      // run using dry_run so we can intercept the generated files
      const fileOverrides = FileSet_fromTextDocuments(documents)
      const { stdout, files } = await dry_run({
        cmd,
        cwd,
        fileOverrides,
      })
      const edit = WorkspaceEdit_fromFileSet(files, (f) => {
        if (!host.existsSync(URL_toFile(f))) {
          return undefined
        }
        return host.readFileSync(URL_toFile(f))
      })
      vscodeWindowMethods.showInformationMessage(stdout)
      await connection.workspace.applyEdit({
        label: 'redwood ' + cmd.processed,
        edit,
      })
    } else {
      // if it can't be intercepted, just run in the terminal
      vscodeWindowMethods.createTerminal2({
        name: 'Redwood',
        cwd,
        cmd: 'yarn redwood ' + cmd.processed,
      })
    }
  }
}
