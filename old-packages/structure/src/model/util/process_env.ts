import { join } from 'path'

import fg from 'fast-glob'
import { readFileSync } from 'fs-extra'
import * as tsm from 'ts-morph'

import { iter } from '../../x/Array'
import { createTSMSourceFile_cached } from '../../x/ts-morph'

export function process_env_findAll(dir: string) {
  return iter(function* () {
    // globSync only works with / as the path separator, even on Windows
    const globPath = join(dir, 'src/**/*.{js,ts,jsx,tsx}').replaceAll('\\', '/')
    for (const file of fg.sync(globPath)) {
      yield* process_env_findInFile(file, readFileSync(file).toString())
    }
  })
}

export function process_env_findInFile(filePath: string, text: string) {
  if (!text.includes('process.env')) {
    return []
  }
  try {
    return process_env_findInFile2(createTSMSourceFile_cached(filePath, text))
  } catch {
    return []
  }
}

export function process_env_findInFile2(sf: tsm.SourceFile) {
  const penvs = sf
    .getDescendantsOfKind(tsm.SyntaxKind.PropertyAccessExpression)
    .filter(is_process_env)
  return iter(function* () {
    for (const penv of penvs) {
      const node = penv.getParent()
      if (!node) {
        continue
      }
      if (tsm.Node.isPropertyAccessExpression(node)) {
        yield { key: node.getName(), node }
      } else if (tsm.Node.isElementAccessExpression(node)) {
        const arg = node.getArgumentExpression()
        if (!arg) {
          continue
        }
        if (!tsm.Node.isStringLiteral(arg)) {
          continue
        }
        yield { key: arg.getLiteralText(), node }
      }
    }
  })
}

function is_process_env(n: tsm.Node): n is tsm.PropertyAccessExpression {
  if (!tsm.Node.isPropertyAccessExpression(n)) {
    return false
  }
  return n.getExpression().getText() === 'process' && n.getName() === 'env'
}
