# CLI Packages - Storybook Vite

This CLI package is intended to be used with the [Storybook Framework package](../../storybook/README.md). We are still finalizing usage details.
For now, get started as follows:

- Run `yarn rw sb` from your project. This will:
  - Add the necessary config files, if they don't already exist: `web/.storybook/{main.ts + preview-body.html}`.
  - Create the Mock Service Worker, which is needed for all Cell mocking.
  - Run Storybook.
