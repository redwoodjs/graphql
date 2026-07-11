import { vi, test, describe, expect } from 'vitest'

import { recordTelemetryAttributes } from '@redwoodjs/cli-helpers'

import { command, description, builder, handler } from '../docker'

vi.mock('../dockerHandler.js')

vi.mock('@redwoodjs/cli-helpers', () => {
  return {
    recordTelemetryAttributes: vi.fn(),
  }
})

describe('setupDocker', () => {
  test("command didn't change unintentionally", () => {
    expect(command).toMatchInlineSnapshot(`"docker"`)
  })

  test("description didn't change unintentionally", () => {
    expect(description).toMatchInlineSnapshot(
      `"Setup the default Redwood Dockerfile"`,
    )
  })

  test('builder configures command options force and verbose ', () => {
    const yargs = {
      option: vi.fn(() => yargs),
      epilogue: vi.fn(() => yargs),
    }

    builder(yargs)

    expect(yargs.option.mock.calls[0][0]).toMatchInlineSnapshot(`"force"`)
    expect(yargs.option.mock.calls[0][1]).toMatchInlineSnapshot(`
      {
        "alias": "f",
        "default": false,
        "description": "Overwrite existing configuration",
        "type": "boolean",
      }
    `)
  })

  test('the handler calls recordTelemetryAttributes', async () => {
    await handler({})

    expect(recordTelemetryAttributes).toHaveBeenCalledWith({
      command: 'setup docker',
      force: undefined,
      verbose: undefined,
    })
  })
})
