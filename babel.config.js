const path = require('path')

const packageJSON = require(path.join(__dirname, 'package.json'))

const TARGETS_NODE = '20.10'

// Run `npx browserslist "defaults"` to see a list of target browsers.
const TARGETS_BROWSERS = ['defaults']

// Warning! Recommended to specify used minor core-js version, like corejs: '3.6',
// instead of corejs: '3', since with '3' it will not be injected modules
// which were added in minor core-js releases.
// https://github.com/zloirock/core-js/blob/master/README.md#babelpreset-env
const CORE_JS_VERSION = packageJSON.devDependencies['core-js']
  .split('.')
  .slice(0, 2)
  .join('.') // Produces: 3.12, instead of 3.12.1

// We use the recommended babel configuration for monorepos, which is a base directory
// `babel.config.js` file, but then use a per-project `.babelrc.js` file.
// Learn more: https://babeljs.io/docs/en/config-files#monorepos

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: TARGETS_NODE },
        useBuiltIns: 'usage',
        corejs: {
          version: CORE_JS_VERSION,
          // List of supported proposals: https://github.com/zloirock/core-js/blob/master/docs/2019-03-19-core-js-3-babel-and-a-look-into-the-future.md#ecmascript-proposals
          proposals: true,
        },
        exclude: [
          'es.error.cause',
          process.env.NODE_ENV !== 'test' && 'proposal-dynamic-import',
        ].filter(Boolean),
      },
    ],
    ['@babel/preset-react', { runtime: 'automatic' }],
    /**
     *  TODO(pc): w/ '@babel/plugin-transform-typescript' in plugins now, is '@babel/typescript' preset still needed?
     *
     * - Plugins run before Presets.
     * - Plugin ordering is first to last.
     * - Preset ordering is reversed (last to first).
     *
     * https://babeljs.io/docs/en/plugins/#plugin-ordering
     */
    '@babel/typescript',
  ],
  plugins: [
    /**
     * NOTE
     * Needed for react@18
     *
     * ```
     * ✖  @redwoodjs/router:build
     *  SyntaxError: /code/redwood/packages/router/src/location.tsx: TypeScript 'declare' fields must first be transformed by @babel/plugin-transform-typescript.
     *  If you have already enabled that plugin (or '@babel/preset-typescript'), make sure that it runs before any plugin related to additional class features:
     *   - @babel/plugin-proposal-class-properties
     *   - @babel/plugin-proposal-private-methods
     *   - @babel/plugin-proposal-decorators
     *    25 |   // When prerendering, there might be more than one level of location
     *    26 |   // providers. Use the values from the one above.
     *  > 27 |   declare context: React.ContextType<typeof LocationContext>
     *       |   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
     *    28 |   HISTORY_LISTENER_ID: string | undefined = undefined
     *    29 |
     *    30 |   state = {
     * ```
     */
    [
      '@babel/plugin-transform-typescript',
      {
        allowDeclareFields: true,
        /** needed in order build `packages/web/dist/entry/index.js` */
        isTSX: true,
        allExtensions: true,
      },
    ],
    /**
     * NOTE
     * Experimental decorators are used in `@redwoodjs/structure`.
     * https://github.com/tc39/proposal-decorators
     **/
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    // The "loose" option must be the same for all three of these plugins.
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    [
      '@babel/plugin-transform-runtime',
      {
        // https://babeljs.io/docs/en/babel-plugin-transform-runtime/#core-js-aliasing
        // Setting the version here also requires `@babel/runtime-corejs3`
        corejs: { version: 3, proposals: true },
        // https://babeljs.io/docs/en/babel-plugin-transform-runtime/#version
        // Transform-runtime assumes that @babel/runtime@7.0.0 is installed.
        // Specifying the version can result in a smaller bundle size.
        version: packageJSON.devDependencies['@babel/runtime-corejs3'],
      },
    ],
    '@babel/plugin-syntax-import-attributes',
  ],
  overrides: [
    // ** WEB PACKAGES **
    {
      test: [
        './packages/auth/',
        './packages/router',
        './packages/forms/',
        './packages/web/',
      ],
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: TARGETS_BROWSERS,
            },
          },
        ],
      ],
      plugins: [
        [
          'babel-plugin-auto-import',
          {
            declarations: [
              {
                // import { React } from 'react'
                default: 'React',
                path: 'react',
              },
            ],
          },
        ],
        // normally provided through preset-env detecting TARGET_BROWSER
        // but webpack 4 has an issue with this
        // see https://github.com/PaulLeCam/react-leaflet/issues/883
        ['@babel/plugin-transform-nullish-coalescing-operator'],
      ],
    },
  ],
  // Ignore test directories when we're not testing
  // Note: No matter what you try to do here, babel will still include
  // snapshot files in the dist output.
  // See https://github.com/babel/babel/issues/11394
  ignore:
    process.env.NODE_ENV === 'test'
      ? []
      : [/\.test\.(js|ts)/, '**/__tests__', '**/__mocks__', '**/__snapshots__'],
}
