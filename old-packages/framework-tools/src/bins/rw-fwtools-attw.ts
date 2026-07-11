import process from 'node:process'

import { attw } from '../attw.js'

async function main() {
  console.log(`Running attw against: ${process.cwd()}`)

  const problems = await attw()
  if (problems.length > 0) {
    console.error('Problems found:')
    for (const problem of problems) {
      console.error(problem)
    }
    process.exit(1)
  }

  console.log('No problems found')
  process.exit(0)
}

main()
