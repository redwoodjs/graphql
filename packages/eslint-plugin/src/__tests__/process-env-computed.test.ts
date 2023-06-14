import { RuleTester } from 'eslint'

import rule from '../process-env-computed.js'

const ruleTester = new RuleTester()

ruleTester.run('process-env-computed', rule, {
  valid: [
    {
      code: 'process.env.foo',
    },
    {
      code: 'process.env.BAR',
    },
    {
      code: 'process.env.REDWOOD_ENV_FOOBAR',
    },
  ],
  invalid: [
    {
      code: 'process.env[foo]',
      errors: [
        {
          message: 'Computed member access on process.env is not allowed.',
        },
      ],
    },
    {
      code: "process.env['BAR']",
      errors: [
        {
          message: 'Computed member access on process.env is not allowed.',
        },
      ],
    },
  ],
})
