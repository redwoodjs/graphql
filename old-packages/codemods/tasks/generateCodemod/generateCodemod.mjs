/* eslint-env node, es2021 */
import fs from 'node:fs'
import url from 'node:url'

import chalk from 'chalk'
import fse from 'fs-extra'
// lodash is commonjs
import template from 'lodash/template.js'
import prompts from 'prompts'

const questions = [
  {
    type: 'text',
    name: 'version',
    message:
      'Which version is this codemod for?\n(The version should be the one that users upgrade to, not from)',
    /**
     * Just some basic validation for now.
     *
     * @param {string} value
     */
    validate(value) {
      if (!value.startsWith('v')) {
        return 'Version must start with a "v"'
      }

      if (!value.endsWith('x')) {
        return 'Version must end with an "x"'
      }

      return true
    },
  },
  {
    type: 'text',
    name: 'name',
    message: "What's the name of your codemod? (camelCase)",
    initial: 'bazinga',
  },
  {
    type: 'select',
    name: 'kind',
    message: 'Which kind of transform?',
    choices: [{ value: 'code' }, { value: 'structure' }],
  },
]

const { version, name, kind } = await prompts(questions, {
  onCancel: () => process.exit(0),
})

await generateCodemod(version, name, kind)

/**
 * @param {string} name
 * @param {['structure'] | ['code']} kind
 */
async function generateCodemod(version, name, kind) {
  console.log(
    `Generating ${chalk.green(kind)} codemod ${chalk.green(
      name,
    )} for ${chalk.green(version)}...`,
  )

  // Make the destination.
  const dest = new URL(
    `../../src/codemods/${version}/${name}/`,
    import.meta.url,
  )
  const [testFixturesDest, testsDest] = ['__testfixtures__/', '__tests__/'].map(
    (dir) => new URL(dir, dest),
  )
  for (const dir of [testFixturesDest, testsDest]) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Interpolate and copy over
  const src = new URL(`templates/${kind}/`, import.meta.url)

  // __testfixtures__
  fse.copySync(
    url.fileURLToPath(new URL('__testfixtures__', src)),
    url.fileURLToPath(testFixturesDest),
  )

  // __tests__
  const codemodTestTs = template(
    fs.readFileSync(new URL('__tests__/codemod.test.ts.template', src), 'utf8'),
  )({ name })
  fs.writeFileSync(new URL(`${name}.test.ts`, testsDest), codemodTestTs)

  // codemod.ts
  const codemodTs = template(
    fs.readFileSync(new URL('codemod.ts.template', src), 'utf8'),
  )({ name })
  fs.writeFileSync(new URL(`${name}.ts`, dest), codemodTs)

  // codemod.yargs.ts
  const { titleName, kebabName } = makeNameVariants(name)

  const codemodYargsTs = template(
    fs.readFileSync(new URL('codemod.yargs.ts.template', src)),
  )({
    titleName,
    kebabName,
    name,
    version,
  })
  fs.writeFileSync(new URL(`${name}.yargs.ts`, dest), codemodYargsTs)

  // README
  const readme = template(fs.readFileSync(new URL('README.md.template', src)))({
    titleName,
  })
  fs.writeFileSync(new URL('README.md', dest), readme)

  console.log('Done')
}

/**
 * @param {string} name
 */
function makeNameVariants(name) {
  const titleName = name
    .split(/(?=[A-Z])/)
    .map((word) => word.toLowerCase())
    .join(' ')
    .replace(/\b[a-z]/g, (match) => match.toUpperCase())

  const kebabName = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

  return {
    titleName,
    kebabName,
  }
}
