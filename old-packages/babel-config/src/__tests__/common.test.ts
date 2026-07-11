import { vol } from 'memfs'

import { getCommonPlugins } from '../common'

const redwoodProjectPath = '/redwood-app'
process.env.RWJS_CWD = redwoodProjectPath

afterEach(() => {
  vol.reset()
})

test("common plugins haven't changed unintentionally", () => {
  const commonPlugins = getCommonPlugins()

  expect(commonPlugins).toMatchInlineSnapshot(`
      [
        [
          "@babel/plugin-transform-class-properties",
          {
            "loose": true,
          },
        ],
        [
          "@babel/plugin-transform-private-methods",
          {
            "loose": true,
          },
        ],
        [
          "@babel/plugin-transform-private-property-in-object",
          {
            "loose": true,
          },
        ],
      ]
    `)
})
