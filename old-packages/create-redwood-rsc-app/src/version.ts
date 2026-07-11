import fs from 'node:fs'

export function getCrwrscaVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
  )
  const version: string = packageJson.version

  return version
}

export function printVersion() {
  console.log(`create-redwood-rsc-app v${getCrwrscaVersion()}`)
}
