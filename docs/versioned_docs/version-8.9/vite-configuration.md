---
description: If you have to configure Vite, here's how
---

# Vite Configuration

Redwood uses Vite. One of Redwood's tenets is convention over configuration.

Vite is an awesome build tool, but we don't want it to be something that you have to be familiar with to be productive.
So it's worth repeating that you don't have to do any of this, because we configure everything you will need out of the box with a Redwood Vite plugin.

Regardless, there'll probably come a time when you have to configure Vite. All the Vite configuration for your web side sits in `web/vite.config.{js,ts}`, and can be configured the same as any other Vite project. Let's take a peek!

```js
import dns from 'dns'
import { defineConfig } from 'vite'
import redwood from '@redwoodjs/vite'

dns.setDefaultResultOrder('verbatim')

const viteConfig = {
  plugins: [
    // 👇 this is the RedwoodJS Vite plugin, that houses all the default configuration
    redwood(),
    // ... add any custom Vite plugins you would like here
  ],
  // You can override built in configuration like server, optimizeDeps, etc. here
}
export default defineConfig(viteConfig)
```

Checkout Vite's docs on [configuration](https://vitejs.dev/config/)

### Sass and Tailwind CSS

Redwood is already configured to use Sass, if the packages are there:

```
yarn workspace web add -D sass sass-loader
```

And if you want to use Tailwind CSS, just run the setup command:

```
yarn rw setup ui tailwindcss
```

## Vite Dev Server

Redwood uses Vite's preview server for local development.
When you run `yarn rw dev`, keys in your `redwood.toml`'s `[web]` table—like `port` and `apiUrl`—are used as vite preview server options (in this case, [preview.port](https://vitejs.dev/config/preview-options.html#preview-port) and [preview.proxy](https://vitejs.dev/config/preview-options.html#preview-proxy) respectively).

> You can peek at all the out-of-the-box configuration for your Vite preview server in the [RedwoodJS Vite plugin](https://github.com/redwoodjs/redwood/blob/main/packages/vite/src/index.ts)

### Using `--forward`

While you can configure Vite using `web/vite.config.js`, it's often simpler to use `yarn rw dev`'s `--forward` option.

For example, if you want to force optimise your Vite dependencies again, you can run:

```
yarn rw dev --fwd="--force"
```

You can also use `--forward` to override keys in your `redwood.toml`.
For example, the following starts your app on port `1234` and disables automatic browser opening:

```
yarn rw dev --forward="--port 1234 --no-open"
```
