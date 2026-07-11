import { $ } from 'zx'

interface Problem {
  kind: string
  entrypoint?: string
  resolutionKind?: string
}

// Excluded entry points:
// - ./bins/rw-vite-build.mjs: this is only used in the build handler
// - ./react-node-loader: used to run the Worker

await $({
  nothrow: true,
})`yarn attw -P --exclude-entrypoints ./bins/rw-vite-build.mjs -f json > .attw.json`
const output = await $`cat .attw.json`
await $`rm .attw.json`

const json = JSON.parse(output.stdout)

if (!json.analysis.problems || json.analysis.problems.length === 0) {
  console.log('No errors found')
  process.exit(0)
}

if (
  json.analysis.problems.every(
    (problem: Problem) => problem.resolutionKind === 'node10',
  )
) {
  console.log("Only found node10 problems, which we don't care about")
  process.exit(0)
}

console.log('Errors found')
console.log(json.analysis.problems)
process.exit(1)
