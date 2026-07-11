import { hydrateRoot, createRoot } from 'react-dom/client'

import App from './App'
import { Document } from './Document'
import Routes from './Routes'

/**
 * When `#redwood-app` isn't empty then it's very likely that you're using
 * prerendering. So React attaches event listeners to the existing markup
 * rather than replacing it.
 * https://react.dev/reference/react-dom/client/hydrateRoot
 */
const redwoodAppElement = document.getElementById('redwood-app')

if (!redwoodAppElement) {
  throw new Error(
    "Could not find an element with ID 'redwood-app'. Please ensure it " +
      "exists in your 'web/src/index.html' file."
  )
}

if (redwoodAppElement.children?.length > 0) {
  hydrateRoot(
    document,
    <Document css={window.__assetMap?.()?.css}>
      <App>
        <Routes />
      </App>
    </Document>
  )
} else {
  const root = createRoot(document)
  root.render(
    <Document css={window.__assetMap?.()?.css}>
      <App>
        <Routes />
      </App>
    </Document>
  )
}
