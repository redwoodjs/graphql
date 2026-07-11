import { extname, join, relative, dirname } from 'path'

import type { PluginObj, types, NodePath } from '@babel/core'
import type { ManifestChunk as ViteManifestChunk } from 'vite'

import { ensurePosixPath, getPaths } from '@redwoodjs/project-config'

import { convertToDataUrl } from './utils'

const defaultOptions = {
  // This list of extensions matches config for file-loader in
  extensions: [
    '.ico',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.svg',
    '.eot',
    '.otf',
    '.webp',
    '.ttf',
    '.woff',
    '.woff2',
    '.cur',
    '.ani',
    '.pdf',
    '.bmp',
  ],
}

type ViteManifest = Record<string, ViteManifestChunk>

function getVariableName(p: NodePath<types.ImportDeclaration>) {
  if (p.node.specifiers?.[0]?.local) {
    return p.node.specifiers[0].local.name
  }
  return null
}

export default function ({ types: t }: { types: typeof types }): PluginObj {
  const manifestPath = join(getPaths().web.dist, 'client-build-manifest.json')
  const buildManifest = require(manifestPath)

  return {
    name: 'babel-plugin-redwood-prerender-media-imports',
    visitor: {
      ImportDeclaration(p, state) {
        const importPath = p.node.source.value
        const ext = extname(importPath)
        const options = {
          ...defaultOptions,
          ...state.opts,
        }

        if (ext && options.extensions.includes(ext)) {
          const importConstName = getVariableName(p)

          if (state.filename === undefined) {
            return
          }
          const absPath = join(dirname(state.filename), p.node.source.value)
          const viteManifestKey = ensurePosixPath(
            relative(getPaths().web.src, absPath),
          )

          // Note: The entry will not exist if vite has inlined a small asset
          const copiedAssetPath = (buildManifest as ViteManifest)[
            viteManifestKey
          ]?.file

          // If the bundler has copied it over, use the path from the asset
          // manifest. Otherwise convert it to a base64 encoded data uri
          const assetSrc =
            copiedAssetPath ??
            convertToDataUrl(
              join(state.file.opts.sourceRoot || './', importPath),
            )

          if (importConstName) {
            p.replaceWith(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  t.identifier(importConstName),
                  t.stringLiteral(assetSrc),
                ),
              ]),
            )
          }
        }
      },
    },
  }
}
