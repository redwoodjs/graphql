import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    sequence: {
      hooks: 'list',
    },
    setupFiles: ['./vitest.setup.mts'],
    logHeapUsage: true,
    server: {
      deps: {
        // Read more about why the fallback is needed in the links below:
        // https://github.com/graphql/graphql-js/issues/2801#issuecomment-1758428498
        // https://github.com/vitejs/vite/issues/7879#issuecomment-1356124664
        // https://nodejs.org/docs/latest-v18.x/api/packages.html#dual-package-hazard
        // TODO: Remove this once we're dual-mode building graphql-server
        fallbackCJS: true,
      },
    },
  },
  resolve: {
    alias: {
      // Note: Without this addition graphql is loaded twice, once .mjs and once .js. graphql throws errors when
      // you have multiple instances of it loaded so tests would fail as a result of loading both ESM and JS versions.
      // This issue: https://github.com/vitejs/vite/issues/7879
      //   - Discussed adding `deps.fallbackCJS: true` and also discussed adding `deps.inline: true` which both failed
      //     to solve the issue. (Those specific config options have moved to inside `server` but still fail to solve
      //     the issue.)
      // This issue: https://github.com/vitest-dev/vitest/issues/4605
      //   - Discussed adding this `resolve.alias` to solve the issue. Comments on the issue highlight that it might have
      //     introduced additional problems that needed even more aliases to be added. I have not seen this here yet.
      // We should aim to understand this a little more and try to avoid needed to add this specific config. That may
      // require some more work on how this package itself is built or how the `package.json` in the `graphql` package
      // is configured.
      graphql: 'graphql/index.js',
    },
  },
})
