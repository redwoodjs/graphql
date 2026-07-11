import path from 'path'

import { format } from 'prettier'

import { getPaths } from '@redwoodjs/project-config'

const getPrettierConfig = async () => {
  try {
    const { default: prettierConfig } = await import(
      `file://${path.join(getPaths().base, 'prettier.config.js')}`
    )
    return prettierConfig
  } catch {
    return undefined
  }
}

const prettify = async (code: string, options: Record<string, any> = {}) => {
  const prettierConfig = await getPrettierConfig()
  return format(code, {
    singleQuote: true,
    semi: false,
    ...prettierConfig,
    parser: 'babel',
    ...options,
  })
}

export default prettify
