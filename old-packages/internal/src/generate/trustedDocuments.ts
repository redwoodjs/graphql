import fs from 'fs'
import path from 'path'

import { format } from 'prettier'

import { getPaths } from '@redwoodjs/project-config'

import type { GeneratedFile } from './types'

// Copy the persisted-documents.json to api side as a trustedDocumentsStore
export const trustedDocumentsStore = async (generatedFiles: any) => {
  let trustedDocumentsStoreFile = ''

  const output = generatedFiles.filter((f: GeneratedFile) =>
    f.filename.endsWith('persisted-documents.json'),
  )

  const storeFile = output[0]

  if (storeFile?.content) {
    const content = await format(`export const store = ${storeFile.content}`, {
      trailingComma: 'es5',
      bracketSpacing: true,
      tabWidth: 2,
      semi: false,
      singleQuote: true,
      arrowParens: 'always',
      parser: 'typescript',
    })

    trustedDocumentsStoreFile = path.join(
      getPaths().api.lib,
      'trustedDocumentsStore.ts',
    )

    fs.mkdirSync(path.dirname(trustedDocumentsStoreFile), { recursive: true })
    fs.writeFileSync(trustedDocumentsStoreFile, content)
  }

  return trustedDocumentsStoreFile
}

// Add the gql function to the generated graphql.ts file
// that is used by trusted documents
export const replaceGqlTagWithTrustedDocumentGraphql = async (
  generatedFiles: any,
) => {
  const gqlFileOutput = generatedFiles.filter((f: GeneratedFile) =>
    f.filename.endsWith('gql.ts'),
  )

  const gqlFile = gqlFileOutput[0]

  if (gqlFile?.content) {
    gqlFile.content += `\n
      export function gql(source: string | TemplateStringsArray) {
        if (typeof source === 'string') {
          return graphql(source)
        }

        return graphql(source.join('\\n'))
      }`

    const content = await format(gqlFile.content, {
      trailingComma: 'es5',
      bracketSpacing: true,
      tabWidth: 2,
      semi: true,
      singleQuote: false,
      arrowParens: 'always',
      parser: 'typescript',
    })

    fs.writeFileSync(gqlFile.filename, content)
  }
}
