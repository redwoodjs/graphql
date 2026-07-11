import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

interface Problem {
  kind: string
  entrypoint?: string
  resolutionKind?: string
}

export async function attw(): Promise<Problem[]> {
  // We can't rely on directly running the attw binary because it's not
  // a direct dependency of the package that will ultimately use this.
  // Instead, we have to do a little work to find the attw binary and run it.
  const require = createRequire(import.meta.url)
  const pathToAttw = require.resolve('@arethetypeswrong/cli/package.json')
  const attwPackageJson = require(pathToAttw)
  const relativeBinPath = attwPackageJson.bin.attw
  const attwBinPath = path.normalize(
    path.resolve(path.dirname(pathToAttw), relativeBinPath),
  )

  // Run attw via it's CLI and save the output to a file
  const outputFileName = '.attw.json'
  const outputFile = fs.openSync(outputFileName, 'w')
  try {
    spawnSync('node', [attwBinPath, '-P', '-f', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', outputFile, outputFile],
    })
  } catch {
    // We don't care about non-zero exit codes
  }
  fs.closeSync(outputFile)

  // Read the resulting JSON file
  const content = fs.readFileSync(outputFileName, {
    encoding: 'utf8',
  })
  fs.unlinkSync(outputFileName)
  const json = JSON.parse(content)

  // If no errors were found then return early
  if (!json.analysis.problems || json.analysis.problems.length === 0) {
    return []
  }

  // We don't care about node10 errors
  const problems: Problem[] = json.analysis.problems.filter(
    (problem: Problem) => problem.resolutionKind !== 'node10',
  )

  return problems
}
