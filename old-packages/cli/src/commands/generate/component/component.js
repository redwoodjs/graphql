import { transformTSToJS } from '../../../lib'
import {
  templateForComponentFile,
  createYargsForComponentGeneration,
} from '../helpers'

const REDWOOD_WEB_PATH_NAME = 'components'

export const files = async ({ name, typescript = false, ...options }) => {
  const extension = typescript ? '.tsx' : '.jsx'
  const componentFile = await templateForComponentFile({
    name,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    extension,
    generator: 'component',
    templatePath: 'component.tsx.template',
  })
  const testFile = await templateForComponentFile({
    name,
    extension: `.test${extension}`,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'component',
    templatePath: 'test.tsx.template',
  })
  const storiesFile = await templateForComponentFile({
    name,
    extension: `.stories${extension}`,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'component',
    // Using two different template files here because we have a TS-specific
    // information in a comment in the .tsx template
    templatePath: typescript ? 'stories.tsx.template' : 'stories.jsx.template',
  })

  const files = [componentFile]
  if (options.stories) {
    files.push(storiesFile)
  }

  if (options.tests) {
    files.push(testFile)
  }

  // Returns
  // {
  //    "path/to/fileA": "<<<template>>>",
  //    "path/to/fileB": "<<<template>>>",
  // }
  return files.reduce(async (accP, [outputPath, content]) => {
    const acc = await accP

    const template = typescript
      ? content
      : await transformTSToJS(outputPath, content)

    return {
      [outputPath]: template,
      ...acc,
    }
  }, Promise.resolve({}))
}

export const description = 'Generate a component'

export const { command, builder, handler } = createYargsForComponentGeneration({
  componentName: 'component',
  filesFn: files,
})
