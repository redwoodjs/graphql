import path from 'node:path'
import { fileURLToPath } from 'node:url'

import klawSync from 'klaw-sync'
import { describe, it, expect } from 'vitest'

const TS_TEMPLATE_DIR = fileURLToPath(
  new URL('../templates/ts', import.meta.url),
)

describe('TS template', () => {
  it('files should not have changed unintentionally', () => {
    expect(getDirectoryStructure(TS_TEMPLATE_DIR)).toMatchInlineSnapshot(`
      [
        "/.editorconfig",
        "/.env",
        "/.env.defaults",
        "/.env.example",
        "/.vscode",
        "/.vscode/extensions.json",
        "/.vscode/launch.json",
        "/.vscode/settings.json",
        "/.vscode/tasks.json",
        "/.yarnrc.yml",
        "/README.md",
        "/api",
        "/api/db",
        "/api/db/schema.prisma",
        "/api/jest.config.js",
        "/api/package.json",
        "/api/src",
        "/api/src/directives",
        "/api/src/directives/requireAuth",
        "/api/src/directives/requireAuth/requireAuth.test.ts",
        "/api/src/directives/requireAuth/requireAuth.ts",
        "/api/src/directives/skipAuth",
        "/api/src/directives/skipAuth/skipAuth.test.ts",
        "/api/src/directives/skipAuth/skipAuth.ts",
        "/api/src/functions",
        "/api/src/functions/graphql.ts",
        "/api/src/graphql",
        "/api/src/graphql/.keep",
        "/api/src/lib",
        "/api/src/lib/auth.ts",
        "/api/src/lib/db.ts",
        "/api/src/lib/logger.ts",
        "/api/src/services",
        "/api/src/services/.keep",
        "/api/tsconfig.json",
        "/gitignore.template",
        "/graphql.config.js",
        "/jest.config.js",
        "/package.json",
        "/prettier.config.js",
        "/redwood.toml",
        "/scripts",
        "/scripts/.keep",
        "/scripts/seed.ts",
        "/scripts/tsconfig.json",
        "/web",
        "/web/jest.config.js",
        "/web/package.json",
        "/web/public",
        "/web/public/README.md",
        "/web/public/favicon.png",
        "/web/public/robots.txt",
        "/web/src",
        "/web/src/App.tsx",
        "/web/src/Routes.tsx",
        "/web/src/components",
        "/web/src/components/.keep",
        "/web/src/entry.client.tsx",
        "/web/src/index.css",
        "/web/src/index.html",
        "/web/src/layouts",
        "/web/src/layouts/.keep",
        "/web/src/pages",
        "/web/src/pages/FatalErrorPage",
        "/web/src/pages/FatalErrorPage/FatalErrorPage.tsx",
        "/web/src/pages/NotFoundPage",
        "/web/src/pages/NotFoundPage/NotFoundPage.tsx",
        "/web/tsconfig.json",
        "/web/vite.config.ts",
      ]
    `)
  })
})

const JS_TEMPLATE_DIR = fileURLToPath(
  new URL('../templates/js', import.meta.url),
)

describe('JS template', () => {
  it('files should not have changed unintentionally', () => {
    expect(getDirectoryStructure(JS_TEMPLATE_DIR)).toMatchInlineSnapshot(`
      [
        "/.editorconfig",
        "/.env",
        "/.env.defaults",
        "/.env.example",
        "/.vscode",
        "/.vscode/extensions.json",
        "/.vscode/launch.json",
        "/.vscode/settings.json",
        "/.vscode/tasks.json",
        "/.yarnrc.yml",
        "/README.md",
        "/api",
        "/api/db",
        "/api/db/schema.prisma",
        "/api/jest.config.js",
        "/api/jsconfig.json",
        "/api/package.json",
        "/api/src",
        "/api/src/directives",
        "/api/src/directives/requireAuth",
        "/api/src/directives/requireAuth/requireAuth.js",
        "/api/src/directives/requireAuth/requireAuth.test.js",
        "/api/src/directives/skipAuth",
        "/api/src/directives/skipAuth/skipAuth.js",
        "/api/src/directives/skipAuth/skipAuth.test.js",
        "/api/src/functions",
        "/api/src/functions/graphql.js",
        "/api/src/graphql",
        "/api/src/graphql/.keep",
        "/api/src/lib",
        "/api/src/lib/auth.js",
        "/api/src/lib/db.js",
        "/api/src/lib/logger.js",
        "/api/src/services",
        "/api/src/services/.keep",
        "/gitignore.template",
        "/graphql.config.js",
        "/jest.config.js",
        "/package.json",
        "/prettier.config.js",
        "/redwood.toml",
        "/scripts",
        "/scripts/.keep",
        "/scripts/jsconfig.json",
        "/scripts/seed.js",
        "/web",
        "/web/jest.config.js",
        "/web/jsconfig.json",
        "/web/package.json",
        "/web/public",
        "/web/public/README.md",
        "/web/public/favicon.png",
        "/web/public/robots.txt",
        "/web/src",
        "/web/src/App.jsx",
        "/web/src/Routes.jsx",
        "/web/src/components",
        "/web/src/components/.keep",
        "/web/src/entry.client.jsx",
        "/web/src/index.css",
        "/web/src/index.html",
        "/web/src/layouts",
        "/web/src/layouts/.keep",
        "/web/src/pages",
        "/web/src/pages/FatalErrorPage",
        "/web/src/pages/FatalErrorPage/FatalErrorPage.jsx",
        "/web/src/pages/NotFoundPage",
        "/web/src/pages/NotFoundPage/NotFoundPage.jsx",
        "/web/vite.config.js",
      ]
    `)
  })
})

/**
 * Used to get the directory structure of the CRWA templates for snapshot testing.
 *
 * Between CI and our branch strategy, this function has to handle some edge cases:
 *
 * - the yarn lint edge case
 *
 *   We run `yarn lint` before `yarn test` in CI.
 *   Running `yarn lint` leads to a call to `getPaths` from `@redwoodjs/internal` which creates the `.redwood` directory.
 *   That directory and its contents aren't part of the template,
 *   but will be picked up by this test and lead to a false negative without this.
 *
 * - the yarn.lock edge case
 *
 *   When we release , we add lock files to the templates to speed up yarn install.
 *   We remove these lock files after releasing.
 *   But before we release, we run all our unit tests, so these test sees an extra file and fails.
 *   While introduces a blind spot (if a lock file gets added, it won't be caught), that's the tradeoff we're making.
 *
 * @param {string} dir
 * @returns string[]
 */
function getDirectoryStructure(dir) {
  const fileStructure = klawSync(dir)

  return fileStructure
    .filter(
      (file) =>
        !filePathsToIgnore.some((filePathToIgnore) =>
          file.path.includes(filePathToIgnore),
        ),
    )
    .map((file) =>
      file.path.replace(dir, '').split(path.sep).join(path.posix.sep),
    )
    .sort()
}

const filePathsToIgnore = ['.redwood', 'yarn.lock']
