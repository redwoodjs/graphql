export class SshExecutor {
  constructor(verbose) {
    const { NodeSSH } = require('node-ssh')
    this.ssh = new NodeSSH()
    this.verbose = verbose
  }

  /**
   * Executes a single command via SSH connection. Throws an error and sets
   * the exit code with the same code returned from the SSH command.
   */
  async exec(path, command, args) {
    const argsString = args?.join(' ') || ''
    const sshCommand = command + (argsString ? ` ${argsString}` : '')

    if (this.verbose) {
      console.log(
        `SshExecutor::exec running command \`${sshCommand}\` in ${path}`,
      )
    }

    const result = await this.ssh.execCommand(sshCommand, {
      cwd: path,
    })

    if (result.code !== 0) {
      const error = new Error(
        `Error while running command \`${sshCommand}\` in ${path}\n` +
          result.stderr,
      )
      error.exitCode = result.code
      throw error
    }

    return result
  }

  connect(options) {
    return this.ssh.connect(options)
  }

  dispose() {
    return this.ssh.dispose()
  }
}
