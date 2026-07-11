import fs from 'fs'

import { describe, it, expect } from 'vitest'

describe('storybook config file fixtures', () => {
  it('main.js', () => {
    const mainTemplatePath = `${__dirname}/../commands/templates/main.ts.template`
    console.log('mainTemplatePath', mainTemplatePath)
    const mainTemplate = fs.readFileSync(mainTemplatePath, { encoding: 'utf8' })
    expect(mainTemplate).toMatchInlineSnapshot(`
      "import type { StorybookConfig } from 'storybook-framework-redwoodjs-vite'

      import { getPaths, importStatementPath } from '@redwoodjs/project-config'

      const redwoodProjectPaths = getPaths()

      const config: StorybookConfig = {
        framework: 'storybook-framework-redwoodjs-vite',

        stories: [
          \`\${importStatementPath(
            redwoodProjectPaths.web.src
          )}/**/*.stories.@(js|jsx|ts|tsx|mdx)\`,
        ],

        addons: ['@storybook/addon-essentials'],
      }

      export default config
      "
    `)
  })

  it('preview-body.html', () => {
    const previewBodyTemplatePath = `${__dirname}/../commands/templates/preview-body.html.template`
    const previewBodyHtml = fs.readFileSync(previewBodyTemplatePath, {
      encoding: 'utf8',
    })
    expect(previewBodyHtml).toMatchInlineSnapshot(
      `"<div id="redwood-app"></div>"`,
    )
  })
})
