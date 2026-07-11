import type { TransformPluginContext } from 'rollup'
import { beforeEach, describe, expect, it } from 'vitest'

import { rscAnalyzePlugin } from '../vite-plugin-rsc-analyze.js'

const foundFiles: string[] = []

function callback(id: string) {
  foundFiles.push(id)
}

function getPluginTransform() {
  const plugin = rscAnalyzePlugin(callback, callback)

  if (typeof plugin.transform !== 'function') {
    throw new Error('Plugin does not have a transform function')
  }

  // Calling `bind` to please TS
  // See https://stackoverflow.com/a/70463512/88106
  // Typecasting because we're only going to call transform, and we don't need
  // anything provided by the context.
  return plugin.transform.bind({} as TransformPluginContext)
}

const pluginTransform = getPluginTransform()

beforeEach(() => {
  foundFiles.length = 0
})

describe('vite-plugin-rsc-analyze', () => {
  it('finds "use server" action inlined as an arrow function', async () => {
    const code = `
      import { jsx, jsxs } from "react/jsx-runtime";
      import fs from "node:fs";
      import "./ServerDelayForm.css";
      const ServerDelayForm = () => {
        let delay = 0;
        if (fs.existsSync("settings.json")) {
          delay = JSON.parse(fs.readFileSync("settings.json", "utf8")).delay || 0;
        }
        return /* @__PURE__ */ jsx("div", { className: "server-delay-form", children: /* @__PURE__ */ jsxs("form", { action: async (formData) => {
          "use server";
          await fs.promises.writeFile("settings.json", \`{ "delay": \${formData.get("delay")} }
      \`);
        }, children: [
          /* @__PURE__ */ jsxs("label", { htmlFor: "delay", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              "Delay (",
              delay,
              "ms)"
            ] }),
            /* @__PURE__ */ jsx("input", { type: "number", id: "delay", name: "delay" })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "submit", children: "Set" })
        ] }) });
      };
      export default ServerDelayForm;
      `

    await pluginTransform(code, 'test.tsx')

    expect(foundFiles).toHaveLength(1)
    expect(foundFiles[0]).toEqual('test.tsx')
  })

  it('finds "use server" action inlined as a named function', async () => {
    const code = `
      import { jsx, jsxs } from "react/jsx-runtime";
      import fs from "node:fs";
      import "./ServerDelayForm.css";
      const ServerDelayForm = () => {
        let delay = 0;
        if (fs.existsSync("settings.json")) {
          delay = JSON.parse(fs.readFileSync("settings.json", "utf8")).delay || 0;
        }
        return /* @__PURE__ */ jsx("div", { className: "server-delay-form", children: /* @__PURE__ */ jsxs("form", { action: async function formAction(formData) {
          "use server";
          await fs.promises.writeFile("settings.json", \`{ "delay": \${formData.get("delay")} }
      \`);
        }, children: [
          /* @__PURE__ */ jsxs("label", { htmlFor: "delay", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              "Delay (",
              delay,
              "ms)"
            ] }),
            /* @__PURE__ */ jsx("input", { type: "number", id: "delay", name: "delay" })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "submit", children: "Set" })
        ] }) });
      };
      export default ServerDelayForm;
      `

    await pluginTransform(code, 'test.tsx')

    expect(foundFiles).toHaveLength(1)
    expect(foundFiles[0]).toEqual('test.tsx')
  })

  it('finds "use server" action as a named function', async () => {
    const code = `
      import { jsx, jsxs } from "react/jsx-runtime";
      import fs from "node:fs";
      import "./ServerDelayForm.css";
      async function formAction(formData) {
        "use server";
        await fs.promises.writeFile("settings.json", \`{ "delay": \${formData.get("delay")} }
      \`);
      }
      const ServerDelayForm = () => {
        let delay = 0;
        if (fs.existsSync("settings.json")) {
          delay = JSON.parse(fs.readFileSync("settings.json", "utf8")).delay || 0;
        }
        return /* @__PURE__ */ jsx("div", { className: "server-delay-form", children: /* @__PURE__ */ jsxs("form", { action: formAction, children: [
          /* @__PURE__ */ jsxs("label", { htmlFor: "delay", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              "Delay (",
              delay,
              "ms)"
            ] }),
            /* @__PURE__ */ jsx("input", { type: "number", id: "delay", name: "delay" })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "submit", children: "Set" })
        ] }) });
      };
      export default ServerDelayForm;
      `

    await pluginTransform(code, 'test.tsx')

    expect(foundFiles).toHaveLength(1)
    expect(foundFiles[0]).toEqual('test.tsx')
  })
})
