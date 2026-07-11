import fs from 'fs'
import path from 'path'

import { load } from 'cheerio'
import execa from 'execa'
import type { TaskInnerAPI } from 'tasuku'

import { getPaths } from '@redwoodjs/project-config'

function checkAndTransformReactRoot(
  taskContext: Pick<TaskInnerAPI, 'setWarning'>,
) {
  const indexHTMLFilepath = path.join(getPaths().web.src, 'index.html')

  const indexHTML = load(fs.readFileSync(indexHTMLFilepath, 'utf-8'))

  const reactRoot = indexHTML('#redwood-app')
  const reactRootChildren = reactRoot.children()

  if (reactRootChildren.length) {
    let reactRootHTML = reactRoot.html()

    if (!reactRootHTML) {
      throw new Error(
        `Couldn't get HTML in react root (div with id="redwood-app")`,
      )
    }

    reactRootHTML = reactRootHTML
      .replace('<!-- Please keep the line below for prerender support. -->', '')
      .replace('&lt;%= prerenderPlaceholder %&gt;', '')
      .split('\n')
      .filter((line) => line.match(/\S/))
      .join('\n')

    taskContext.setWarning(
      [
        `The react root (<div id="redwood-app"></div>) in ${indexHTMLFilepath} has children:`,
        '',
        reactRootHTML,
        '',
        'React expects to control this DOM node completely. This codemod has moved the children outside the react root,',
        'but consider moving them into a layout.',
      ].join('\n'),
    )
  }

  indexHTML('body').append(reactRootChildren)
  reactRoot.text('')

  fs.writeFileSync(indexHTMLFilepath, indexHTML.html())
}

async function upgradeReactDepsTo18() {
  const redwoodProjectPaths = getPaths()

  const webPackageJSONPath = path.join(
    redwoodProjectPaths.web.base,
    'package.json',
  )

  const webPackageJSON = JSON.parse(
    fs.readFileSync(webPackageJSONPath, 'utf-8'),
  )

  const latestReactVersion = '18.2.0'

  for (const requiredReactDep of ['react', 'react-dom']) {
    if (!Object.hasOwn(webPackageJSON.dependencies, requiredReactDep)) {
      throw new Error(
        `Couldn't find ${requiredReactDep} in web/package.json dependencies`,
      )
    }

    webPackageJSON.dependencies[requiredReactDep] = latestReactVersion
  }

  fs.writeFileSync(webPackageJSONPath, JSON.stringify(webPackageJSON, null, 2))

  await execa.command('yarn install', {
    cwd: redwoodProjectPaths.base,
  })
}

async function checkAndUpdateCustomWebIndex(taskContext: TaskInnerAPI) {
  // First check if the custom web index exists. If it doesn't, this is a no-op.
  const redwoodProjectPaths = getPaths()

  const bundlerToCustomWebIndex = {
    vite: path.join(redwoodProjectPaths.web.src, 'entry-client.jsx'),
    webpack: path.join(redwoodProjectPaths.web.src, 'index.js'),
  }

  const customWebIndexFound = Object.entries(bundlerToCustomWebIndex).find(
    ([, filepath]) => fs.existsSync(filepath),
  )

  if (!customWebIndexFound) {
    return
  }

  fs.writeFileSync(customWebIndexFound[1], customWebIndexTemplate)

  taskContext.setWarning(
    [
      `We updated the custom web index for you at ${customWebIndexFound[1]}.`,
      "  If you made manual changes to this file, you'll have to copy them over manually from the diff.",
    ].join('\n'),
  )
}

const customWebIndexTemplate = `\
import { hydrateRoot, createRoot } from 'react-dom/client'

import App from './App'
/**
 * When \`#redwood-app\` isn't empty then it's very likely that you're using
 * prerendering. So React attaches event listeners to the existing markup
 * rather than replacing it.
 * https://reactjs.org/docs/react-dom-client.html#hydrateroot
 */
const redwoodAppElement = document.getElementById('redwood-app')

if (redwoodAppElement.children?.length > 0) {
  hydrateRoot(redwoodAppElement, <App />)
} else {
  const root = createRoot(redwoodAppElement)
  root.render(<App />)
}
`

export {
  checkAndTransformReactRoot,
  upgradeReactDepsTo18,
  checkAndUpdateCustomWebIndex,
}
