# Convert Js To Jsx

**Description**

Vite works best when you avoid using `.js` files which actually contain JSX inside them. They should ideally be given the `.jsx` extension. Features such as hot reloading is unavailable in cases where you use `.js` where `.jsx` is more appropriate.

This codemod examines all files ending in `.js` within your `web/src` and renames any files which contains JSX to end with `.jsx` instead of `.js`.

**NOTE**: The contents of your files are untouched. This only affects the extension.

**Examples**

For example the following `App.js`:

```js
import { FatalErrorBoundary, RedwoodProvider } from '@redwoodjs/web'
import { RedwoodApolloProvider } from '@redwoodjs/web/apollo'

import FatalErrorPage from 'src/pages/FatalErrorPage'
import Routes from 'src/Routes'

import './index.css'

const App = () => (
  <FatalErrorBoundary page={FatalErrorPage}>
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <RedwoodApolloProvider>
        <Routes />
      </RedwoodApolloProvider>
    </RedwoodProvider>
  </FatalErrorBoundary>
)

export default App
```

would become `App.jsx` as it clearly contains JSX.

However a file such as `TestCell.mock.js`:

```js
// Define your own mock data here:
export const standard = (/* vars, { ctx, req } */) => ({
  test: {
    id: 42,
  },
})
```

would remain `TestCell.mock.js` as it does not contain JSX.
