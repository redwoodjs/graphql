import { vi, describe, expect, it } from 'vitest'
import type { Argv } from 'yargs'

import * as installCommand from '../commands/install'
import { handler as dataMigrateInstallHandler } from '../commands/installHandler.js'

vi.mock('../commands/installHandler.js', () => ({
  handler: vi.fn(),
}))

describe('install', () => {
  it('exports `command`, `description`, `builder`, and `handler`', () => {
    for (const property of ['command', 'builder', 'description', 'handler']) {
      expect(installCommand).toHaveProperty(property)
    }
  })

  it("`command` and `description` haven't unintentionally changed", () => {
    expect(installCommand.command).toMatchInlineSnapshot(`"install"`)
    expect(installCommand.description).toMatchInlineSnapshot(
      `"Add the RW_DataMigration model to your schema"`,
    )
  })

  it('`builder` has an epilogue', () => {
    // The typecasting here is to make TS happy when calling `builder(yargs)`
    // further down. We know that only `epilogue` will be called.
    const yargs = { epilogue: vi.fn() } as unknown as Argv

    installCommand.builder(yargs)

    // The epilogue is a string that contains a link to the docs. The string
    // contains special control characters when rendered in a terminal that
    // supports clickable links. We use regular expressions and wildcards here
    // to avoid having to match control characters that might not even always
    // be there
    expect(yargs.epilogue).toHaveBeenCalledWith(
      expect.stringMatching(/Also see the .*Redwood CLI Reference.*/),
    )
    expect(yargs.epilogue).toHaveBeenCalledWith(
      expect.stringMatching(
        /https:\/\/redwoodjs\.com\/docs\/cli-commands#datamigrate-install/,
      ),
    )
  })

  it('`handler` proxies to `./installHandler.js`', async () => {
    await installCommand.handler()
    expect(dataMigrateInstallHandler).toHaveBeenCalled()
  })
})
