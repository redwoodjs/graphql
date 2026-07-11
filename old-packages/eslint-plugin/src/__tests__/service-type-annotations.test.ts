import tsEslintParser from '@typescript-eslint/parser'
import { RuleTester } from '@typescript-eslint/rule-tester'

import { serviceTypeAnnotations } from '../service-type-annotations.js'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsEslintParser,
    parserOptions: {
      projectServices: {
        allowDefaultProject: ['*.ts*'],
        defaultProject: 'tsconfig.json',
      },
      tsconfigRootDir: '/',
    },
  },
})

ruleTester.run('service-type-annotations', serviceTypeAnnotations, {
  valid: [
    {
      code: '// no exports',
    },
    {
      code: 'function abc() {}',
    },
    {
      filename:
        '/app/api/src/services/notificationSubscriptions/notificationSubscriptions.ts',
      code: `
        import type { AbcResolver } from "types/notificationSubscriptions.js"
        export const abc: AbcResolver = () => {}`,
    },
  ],
  invalid: [
    {
      filename:
        '/app/api/src/services/notificationSubscriptions/notificationSubscriptions.ts',
      code: 'export const abc = () => {}',
      output:
        'import type { AbcResolver } from "types/notificationSubscriptions"\n' +
        'export const abc: AbcResolver = () => {}',
      errors: [
        {
          message:
            'The query/mutation function (abc) needs a type annotation of AbcResolver.',
        },
      ],
    },
  ],
})
