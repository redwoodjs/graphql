import { transformTSToJS } from '../../../lib'
import { yargsDefaults } from '../helpers'
import {
  templateForComponentFile,
  createYargsForComponentGeneration,
  removeGeneratorName,
} from '../helpers'

const COMPONENT_SUFFIX = 'Layout'
const REDWOOD_WEB_PATH_NAME = 'layouts'

export const files = async ({ name, typescript = false, ...options }) => {
  const layoutName = removeGeneratorName(name, 'layout')
  const extension = typescript ? '.tsx' : '.jsx'
  const layoutFile = await templateForComponentFile({
    name: layoutName,
    suffix: COMPONENT_SUFFIX,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    extension,
    generator: 'layout',
    templatePath: options.skipLink
      ? 'layout.tsx.a11y.template'
      : 'layout.tsx.template',
  })
  const testFile = await templateForComponentFile({
    name: layoutName,
    suffix: COMPONENT_SUFFIX,
    extension: `.test${extension}`,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'layout',
    templatePath: 'test.tsx.template',
  })
  const storyFile = await templateForComponentFile({
    name: layoutName,
    suffix: COMPONENT_SUFFIX,
    extension: `.stories${extension}`,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'layout',
    templatePath: 'stories.tsx.template',
  })

  const files = [layoutFile]
  if (options.stories) {
    files.push(storyFile)
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

const optionsObj = {
  skipLink: {
    default: false,
    description: 'Generate with skip link',
    type: 'boolean',
  },
  ...yargsDefaults,
}

export const { command, description, builder, handler } =
  createYargsForComponentGeneration({
    componentName: 'layout',
    filesFn: files,
    optionsObj,
  })
