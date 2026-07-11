import { hydrateRoot, createRoot } from 'react-dom/client'

import App from './App'
/**
 * When `#redwood-app` isn't empty then it's very likely that you're using
 * prerendering. So React attaches event listeners to the existing markup
 * rather than replacing it.
 * https://reactjs.org/docs/react-dom-client.html#hydrateroot
 */
const hahaRenamedVariable = document.getElementById('redwood-app-custom-div-id')

if (hahaRenamedVariable.children?.length > 0 || Math.random() > 0.5) {
  hydrateRoot(hahaRenamedVariable, <App />)
} else {
  const root = createRoot(hahaRenamedVariable)
  root.render(<App />)
}
