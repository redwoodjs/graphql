---
description: A component-driven development workflow
---

# Storybook

[Storybook](https://storybook.js.org) enables the kind of frontend-first, component-driven development workflow that we've always wanted.
By developing your UI components in isolation, you get to focus exclusively on your UI's needs,
saving you from getting too caught up in the details of your API too early.

Storybook also makes debugging a lot easier.
You don't have to start the dev server, login as a user, tab through dropdowns, and click buttons just for that one bug to show up.
And say goodbye to rendering a whole page and make six GraphQL calls just to change the color of a modal!
You can set up every component as a story and tweak it within Storybook. And for any [cells](./cells.md), [mocking GraphQL could not be easier!](./how-to/mocking-graphql-in-storybook.md)

RedwoodJS offers a Storybook integration leveraging Storybook's [Framework Packages](https://storybook.js.org/docs/7/configure/integration/frameworks),
using Vite as its bundler to align with your production project.

An older version of our Storybook integration used Webpack as its bundler — For more information on the differences, see [this forum post](https://community.redwoodjs.com/t/storybook-in-redwood-is-moving-to-vite/7212).
If you were previously using this older version, see [this section](#migrating-from-storybook-webpack-to-storybook-vite).

## Getting Started with Storybook

You can start Storybook with `yarn rw storybook`:

```
yarn rw storybook
```

If this is your first time running Storybook:

- The Redwood CLI will install Storybook, the framework package, and all related dependencies.
- The Redwood CLI will create the following config files for you:
  - `web/.storybook/main.ts`
    - This is the primary [Storybook configuration file](https://storybook.js.org/docs/7/configure). Note that it references our framework package, [`storybook-framework-redwoodjs-vite`](https://www.npmjs.com/package/storybook-framework-redwoodjs-vite).
  - `web/.storybook/preview-body.html`
    - This is required to change the `id` of the root div to `redwood-app`, which is what the entry file used by Vite requires.

Once Storybook is all set up, it'll spin up on localhost port `7910` and open your browser.

## Configuring Storybook

To configure Storybook, please follow [the official Storybook docs](https://storybook.js.org/docs/7/configure).

## Migrating from Storybook Webpack to Storybook Vite

An older version of our Storybook integration relied on Webpack. If you're just getting started with Storybook, this does not apply to you! 😊

If you've been using Storybook for a while, you might need to take some manual steps in upgrading to the new version.

If you don't have any custom [Storybook configuration](https://redwoodjs.com/docs/7.x/storybook/#configuring-storybook), you should be good to go - no changes needed. The Out of Box experience should be the same, and please [let us know](https://github.com/redwoodjs/redwood/issues/new?assignees=&labels=bug%2Fneeds-info&projects=&template=bug-report.yml&title=%5BBug%5D%3A+) if you run into any issues.

If you do have custom Storybook configuration, then you'll need to manually migrate it over to the new files. For example, if you've got any global decorators, you can now just follow the official Storybook docs on that: https://storybook.js.org/docs/7/writing-stories/decorators#global-decorators
