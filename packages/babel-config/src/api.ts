import fs from 'node:fs'
import path from 'node:path'

import type { PluginOptions, PluginTarget, TransformOptions } from '@babel/core'
import { transformAsync } from '@babel/core'

import { getPaths, projectSideIsEsm } from '@redwoodjs/project-config'

import type { RegisterHookOptions } from './common'
import {
  CORE_JS_VERSION,
  RUNTIME_CORE_JS_VERSION,
  getCommonPlugins,
  getPathsFromTypeScriptConfig,
  parseTypeScriptConfigFiles,
  registerBabel,
} from './common'
import pluginRedwoodContextWrapping from './plugins/babel-plugin-redwood-context-wrapping'
import pluginRedwoodDirectoryNamedImport from './plugins/babel-plugin-redwood-directory-named-import'
import pluginRedwoodGraphqlOptionsExtract from './plugins/babel-plugin-redwood-graphql-options-extract'
import pluginRedwoodImportDir from './plugins/babel-plugin-redwood-import-dir'
import pluginRedwoodJobPathInjector from './plugins/babel-plugin-redwood-job-path-injector'
import pluginRedwoodOTelWrapping from './plugins/babel-plugin-redwood-otel-wrapping'

export const TARGETS_NODE = '20.10'

export const getApiSideBabelPresets = (
  { presetEnv } = { presetEnv: false },
) => {
  return [
    [
      '@babel/preset-typescript',
      {
        isTSX: true,
        allExtensions: true,
      },
      'rwjs-babel-preset-typescript',
    ],
    // Preset-env is required when we are not doing the transpilation with esbuild
    presetEnv && [
      '@babel/preset-env',
      {
        targets: {
          node: TARGETS_NODE,
        },
        useBuiltIns: 'usage',
        corejs: {
          version: CORE_JS_VERSION,
          // List of supported proposals: https://github.com/zloirock/core-js/blob/master/docs/2019-03-19-core-js-3-babel-and-a-look-into-the-future.md#ecmascript-proposals
          proposals: true,
        },
        exclude: [
          // Remove class-properties from preset-env, and include separately with loose
          // https://github.com/webpack/webpack/issues/9708
          '@babel/plugin-transform-class-properties',
          '@babel/plugin-transform-private-methods',
        ],
      },
    ],
  ].filter(Boolean) as TransformOptions['presets']
}

export const BABEL_PLUGIN_TRANSFORM_RUNTIME_OPTIONS = {
  // See https://babeljs.io/docs/babel-plugin-transform-runtime/#corejs
  // and https://babeljs.io/docs/en/babel-plugin-transform-runtime/#core-js-aliasing.
  //
  // This results in over polyfilling.
  corejs: { version: 3, proposals: true },

  // See https://babeljs.io/docs/en/babel-plugin-transform-runtime/#version.
  version: RUNTIME_CORE_JS_VERSION,
}

// Plugin shape: [ ["Target", "Options", "name"] ],
// a custom "name" can be supplied so that user's do not accidentally overwrite
// Redwood's own plugins when they specify their own.
export type PluginList = PluginShape[]
type PluginShape =
  | [PluginTarget, PluginOptions, undefined | string]
  | [PluginTarget, PluginOptions]

export const getApiSideBabelPlugins = ({
  openTelemetry = false,
  projectIsEsm = false,
} = {}) => {
  const tsConfig = parseTypeScriptConfigFiles()

  const plugins: (PluginShape | boolean)[] = [
    ...getCommonPlugins(),
    // Needed to support `/** @jsxImportSource custom-jsx-library */`
    // comments in JSX files
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
    ['@babel/plugin-transform-runtime', BABEL_PLUGIN_TRANSFORM_RUNTIME_OPTIONS],
    [
      'babel-plugin-module-resolver',
      {
        alias: {
          src: './src',
          // adds the paths from [ts|js]config.json to the module resolver
          ...getPathsFromTypeScriptConfig(tsConfig.api, getPaths().api.base),
        },
        root: [getPaths().api.base],
        cwd: 'packagejson',
        loglevel: 'silent', // to silence the unnecessary warnings
      },
      'rwjs-api-module-resolver',
    ],
    [
      pluginRedwoodDirectoryNamedImport,
      undefined,
      'rwjs-babel-directory-named-modules',
    ],
    [
      'babel-plugin-auto-import',
      {
        declarations: [
          {
            // import gql from 'graphql-tag'
            default: 'gql',
            path: 'graphql-tag',
          },
          {
            // import { context } from '@redwoodjs/context'
            members: ['context'],
            path: '@redwoodjs/context',
          },
        ],
      },
      'rwjs-babel-auto-import',
    ],
    // FIXME: `graphql-tag` is not working: https://github.com/redwoodjs/redwood/pull/3193
    ['babel-plugin-graphql-tag', undefined, 'rwjs-babel-graphql-tag'],
    [
      pluginRedwoodImportDir,
      {
        projectIsEsm,
      },
      'rwjs-babel-glob-import-dir',
    ],
    openTelemetry && [
      pluginRedwoodOTelWrapping,
      undefined,
      'rwjs-babel-otel-wrapping',
    ],
  ]

  return plugins.filter(Boolean) as PluginList // ts doesn't play nice with filter(Boolean)
}

export const getApiSideBabelConfigPath = () => {
  const p = path.join(getPaths().api.base, 'babel.config.js')
  if (fs.existsSync(p)) {
    return p
  } else {
    return
  }
}

export const getApiSideBabelOverrides = ({ projectIsEsm = false } = {}) => {
  const overrides = [
    // Extract graphql options from the graphql function
    // NOTE: this must come before the context wrapping
    {
      // match */api/src/functions/graphql.js|ts
      test: /.+api(?:[\\|/])src(?:[\\|/])functions(?:[\\|/])graphql\.(?:js|ts)$/,
      plugins: [pluginRedwoodGraphqlOptionsExtract],
    },
    // Apply context wrapping to all functions
    {
      // match */api/src/functions/*.js|ts
      test: /.+api(?:[\\|/])src(?:[\\|/])functions(?:[\\|/]).+.(?:js|ts)$/,
      plugins: [
        [
          pluginRedwoodContextWrapping,
          {
            projectIsEsm,
          },
        ],
      ],
    },
    // Add import names and paths to job definitions
    {
      // match */api/src/jobs/*.js|ts
      test: /.+api(?:[\\|/])src(?:[\\|/])jobs(?:[\\|/]).+.(?:js|ts)$/,
      plugins: [[pluginRedwoodJobPathInjector]],
    },
  ].filter(Boolean)
  return overrides as TransformOptions[]
}

export const getApiSideDefaultBabelConfig = ({ projectIsEsm = false } = {}) => {
  return {
    presets: getApiSideBabelPresets(),
    plugins: getApiSideBabelPlugins({ projectIsEsm }),
    overrides: getApiSideBabelOverrides({ projectIsEsm }),
    extends: getApiSideBabelConfigPath(),
    babelrc: false,
    ignore: ['node_modules'],
  }
}

// Used in cli commands that need to use es6, lib and services
export const registerApiSideBabelHook = ({
  plugins = [],
  ...rest
}: RegisterHookOptions = {}) => {
  const defaultOptions = getApiSideDefaultBabelConfig({
    projectIsEsm: projectSideIsEsm('api'),
  })

  registerBabel({
    ...defaultOptions,
    presets: getApiSideBabelPresets({
      presetEnv: true,
    }),
    extensions: ['.js', '.ts', '.jsx', '.tsx'],
    plugins: [...defaultOptions.plugins, ...plugins],
    cache: false,
    ...rest,
  })
}

export const transformWithBabel = async (
  srcPath: string,
  plugins: TransformOptions['plugins'],
) => {
  const code = await fs.promises.readFile(srcPath, 'utf-8')
  const defaultOptions = getApiSideDefaultBabelConfig({
    projectIsEsm: projectSideIsEsm('api'),
  })

  const result = transformAsync(code, {
    ...defaultOptions,
    cwd: getPaths().api.base,
    filename: srcPath,
    // we need inline sourcemaps at this level
    // because this file will eventually be fed to esbuild
    // when esbuild finds an inline sourcemap, it tries to "combine" it
    // so the final sourcemap (the one that esbuild generates) combines both mappings
    sourceMaps: 'inline',
    plugins,
  })

  return result
}
