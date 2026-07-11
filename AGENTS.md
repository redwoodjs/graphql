You can find doc for @redwoodjs/ packages online at https://cedarjs.com/docs/8.x/introduction You can find doc for
RedwoodSDK (@rwsdk/ packages) online at https://docs.rwsdk.com/

## RedwoodGQL Direction

RedwoodGQL is an early proof of concept for a new RedwoodJS GraphQL path that can migrate block by block from a classic
RedwoodJS (Cedar) app.

- Use `README.md` as the source of truth for product direction, architecture, package intent, and parity goals.
- Treat `test-apps/` as demo / PoC applications that prove the packages working together end-to-end.
- Treat `packages/` as the WIP "framework" / SDK surface. Each package should keep dependencies minimal, expose focused
  primitives, and work in isolation when its direct peer requirements are present.
- Prefer package boundaries that let users adopt one block at a time. For example, `@rwgql/cell` should work with
  Apollo Client, `@rwgql/rwsdk-apollo-client` should require only RedwoodSDK plus Apollo GraphQL pieces,
  `@rwgql/pgserve-dev` should work anywhere Vite Task is available, and `@rwgql/prisma-dev` should require Vite Task
  plus Prisma.
- Use [migrating-from-redwoodjs.md](migrating-from-redwoodjs.md) and GitHub parity issues for Cedar → RedwoodGQL
  migration guidance; do not recreate a full classic Redwood app in-tree unless the task is explicitly about parity.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Cursor Cloud specific instructions

The Vite+ CLI (`vp`) is pre-installed in the VM snapshot and symlinked at `/usr/local/bin/vp` (so it is on `PATH` in
non-login shells). The startup update script runs `vp install`. Standard commands (`vp check`, `vp test`,
`vp run -r build`, `vp run dev`) are documented in `README.md`.

### Running the stack

`vp run dev` builds packages, starts pgserve, migrates + seeds, then runs the web app and the GraphQL/auth server in
parallel (see `README.md` for the exact ports and URLs). Run it under tmux since it is long-lived. pgserve needs no
`XDG_RUNTIME_DIR` setup — its socket lands in `/tmp/pgserve` when the var is unset. The GraphQL `posts` query is
public; `contacts`/`users` are behind the `requireAuth` directive, so query them only with a logged-in session.

### Tests

`vp test` includes browser-mode (Vitest + Playwright) tests for React components, which require the Playwright Chromium
browser. Install it once if missing (it persists in the snapshot under `~/.cache/ms-playwright`):

```bash
node node_modules/.pnpm/playwright@*/node_modules/playwright/cli.js install chromium
```

`npx playwright ...` fails here because the repo pins pnpm via `devEngines`; invoke the CLI via `node ...` (above) or
`pnpm`.
