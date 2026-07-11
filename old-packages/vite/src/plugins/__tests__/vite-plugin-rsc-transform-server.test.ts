import { vol } from 'memfs'
import type { TransformPluginContext } from 'rollup'
import {
  afterAll,
  beforeAll,
  describe,
  it,
  expect,
  vi,
  afterEach,
} from 'vitest'

import { rscTransformUseServerPlugin } from '../vite-plugin-rsc-transform-server.js'

vi.mock('fs', async () => ({ default: (await import('memfs')).fs }))

const RWJS_CWD = process.env.RWJS_CWD

beforeAll(() => {
  process.env.RWJS_CWD = '/Users/tobbe/rw-app/'

  // Add a toml entry for getPaths et al.
  vol.fromJSON({ 'redwood.toml': '' }, process.env.RWJS_CWD)
})

afterAll(() => {
  process.env.RWJS_CWD = RWJS_CWD
})

function getPluginTransform(serverEntryFiles: Record<string, string>) {
  const plugin = rscTransformUseServerPlugin('some/dist/path', serverEntryFiles)

  if (typeof plugin.transform !== 'function') {
    throw new Error('Plugin does not have a transform function')
  }

  // Calling `bind` to please TS
  // See https://stackoverflow.com/a/70463512/88106
  // Typecasting because we're only going to call transform, and we don't need
  // anything provided by the context.
  return plugin.transform.bind({} as TransformPluginContext)
}

const id = 'rw-app/web/src/some/path/to/actions.ts'
const pluginTransform = getPluginTransform({
  'rsa-actions.ts-0': id,
})

describe('rscTransformUseServerPlugin module scoped "use server"', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should handle one function', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      export async function formAction(formData: FormData) {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            export async function formAction(formData: FormData) {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

      import {registerServerReference} from "react-server-dom-webpack/server";
      registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","formAction");
      "
    `)
  })

  it('should handle two functions', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      export async function formAction1(formData: FormData) {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }

      export async function formAction2(formData: FormData) {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            export async function formAction1(formData: FormData) {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

            export async function formAction2(formData: FormData) {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

      import {registerServerReference} from "react-server-dom-webpack/server";
      registerServerReference(formAction1,"some/dist/path/assets/rsa-actions.ts-0.mjs","formAction1");
      registerServerReference(formAction2,"some/dist/path/assets/rsa-actions.ts-0.mjs","formAction2");
      "
    `)
  })

  it('should handle arrow function', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      export const formAction = async (formData: FormData) => {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            export const formAction = async (formData: FormData) => {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

      import {registerServerReference} from "react-server-dom-webpack/server";
      if (typeof formAction === "function") registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","formAction");
      "
    `)
  })

  it('should handle exports with two consts', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      export const fortyTwo = () => 42, formAction = async (formData: FormData) => {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            export const fortyTwo = () => 42, formAction = async (formData: FormData) => {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

      import {registerServerReference} from "react-server-dom-webpack/server";
      if (typeof fortyTwo === "function") registerServerReference(fortyTwo,"some/dist/path/assets/rsa-actions.ts-0.mjs","fortyTwo");
      if (typeof formAction === "function") registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","formAction");
      "
    `)
  })

  it('should handle named function and arrow function with separate export', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      async function formAction(formData: FormData) {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }

      const arrowAction = async (formData: FormData) => {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }

      export { formAction, arrowAction }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            async function formAction(formData: FormData) {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

            const arrowAction = async (formData: FormData) => {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

            export { formAction, arrowAction }

      import {registerServerReference} from "react-server-dom-webpack/server";
      if (typeof formAction === "function") registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","formAction");
      if (typeof arrowAction === "function") registerServerReference(arrowAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","arrowAction");
      "
    `)
  })

  it('should handle separate renamed export', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      async function formAction(formData: FormData) {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }

      const arrowAction = async (formData: FormData) => {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }

      export { formAction as fA, arrowAction }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            async function formAction(formData: FormData) {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

            const arrowAction = async (formData: FormData) => {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

            export { formAction as fA, arrowAction }

      import {registerServerReference} from "react-server-dom-webpack/server";
      if (typeof formAction === "function") registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","fA");
      if (typeof arrowAction === "function") registerServerReference(arrowAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","arrowAction");
      "
    `)
  })

  it.todo('should handle default exported arrow function', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      export default async (formData: FormData) => {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            export default async (formData: FormData) => {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

      import {registerServerReference} from "react-server-dom-webpack/server";
      registerServerReference(default,"some/dist/path/assets/rsa-actions.ts-0.mjs","default");
      "
    `)
  })

  it('should handle default exported named function', async () => {
    const input = `
      "use server"

      import fs from 'node:fs'

      async function formAction(formData: FormData) {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\`
        )
      }

      export default formAction`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      ""use server"

            import fs from 'node:fs'

            async function formAction(formData: FormData) {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

            export default formAction

      import {registerServerReference} from "react-server-dom-webpack/server";
      if (typeof formAction === "function") registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","default");
      "
    `)
  })

  it('should handle default exported inline-named function', async () => {
    const input = `
        "use server"

        import fs from 'node:fs'

        export default async function formAction(formData: FormData) {
          await fs.promises.writeFile(
            'settings.json',
            \`{ "delay": \${formData.get('delay')} }\`
          )
        }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
        ""use server"

              import fs from 'node:fs'

              export default async function formAction(formData: FormData) {
                await fs.promises.writeFile(
                  'settings.json',
                  \`{ "delay": \${formData.get('delay')} }\`
                )
              }

        import {registerServerReference} from "react-server-dom-webpack/server";
        registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","default");
        "
      `)
  })

  it.todo('should handle default exported anonymous function', async () => {
    const input = `
      'use server'

      import fs from 'node:fs'

      export default async function (formData: FormData) {
        await fs.promises.writeFile(
          'settings.json',
          \`{ "delay": \${formData.get('delay')} }\n\`
        )
      }`.trim()

    const output = await pluginTransform(input, id)

    expect(output).toMatchInlineSnapshot(`
      "'use server'

            import fs from 'node:fs'

            export async function formAction(formData: FormData) {
              await fs.promises.writeFile(
                'settings.json',
                \`{ "delay": \${formData.get('delay')} }\`
              )
            }

      import {registerServerReference} from "react-server-dom-webpack/server";
      registerServerReference(formAction,"some/dist/path/assets/rsa-actions.ts-0.mjs","formAction");
      "
    `)
  })
})
