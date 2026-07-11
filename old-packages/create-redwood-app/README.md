[![RedwoodJS](https://raw.githubusercontent.com/redwoodjs/redwoodjs.com/main/publish/images/mark-logo-cover.png)](https://redwoodjs.com)

<!-- prettier-ignore-start -->
<p align="center">
  <a aria-label="Start the Tutorial" href="https://redwoodjs.com/docs/tutorial">
    <img alt="" src="https://img.shields.io/badge/Start%20the%20Tutorial-%23BF4722?style=for-the-badge&labelColor=000000&logoWidth=20&logo=RedwoodJS">
  </a>
  <a aria-label="Join the Forums" href="https://community.redwoodjs.com">
    <img alt="" src="https://img.shields.io/badge/Join%20the%20Forums-%23FFF9AE?style=for-the-badge&labelColor=000000&logoWidth=20&logo=Discourse">
  </a>
  <a aria-label="Join the Chat" href="https://discord.gg/redwoodjs">
    <img alt="" src="https://img.shields.io/badge/Join%20the%20Chat-%237289DA?style=for-the-badge&labelColor=000000&logoWidth=20&logo=Discord&logoColor=white">
  </a>
</p>
<!-- prettier-ignore-end -->
<br>
<h1 align="center">The App Framework for Startups</h1>

<h2 align="center">Ship today with architecture for tomorrow.</h2>

Redwood is an opinionated framework for modern multi-client applications, built on React, GraphQL, and Prisma with full TypeScript support and ready to go with zero config.

Want great developer experience and easy scaling? How about an integrated front- and back-end test suite, boilerplate code generators, component design, logging, API security + auth, and serverless or traditional deploy support? Redwood is here! Redwood works with the components and development workflow you love but with simple conventions and helpers to make your experience even better.

<h2>Quick Start</h2>

Redwood requires Node.js =20.x.

```bash
yarn create redwood-app my-redwood-app
cd my-redwood-app
yarn install
yarn redwood dev
```

<h3>Resources</h3>

- The [Redwood Tutorial](https://redwoodjs.com/docs/tutorial): the best way to learn Redwood
- The [Redwood CLI](https://redwoodjs.com/docs/cli-commands): code generators, DB helpers, setup commands, and more
- [Documentation](https://redwoodjs.com/docs) and [How To's](https://redwoodjs.com/how-to/custom-function)
- Join the Community [Forums](https://community.redwoodjs.com) and [Chat](https://discord.gg/redwoodjs)

<h2>Contributing to create-redwood-app</h2>

_Contributors are Welcome! Get started [here](https://redwoodjs.com/docs/contributing). And don't hesitate to ask for help on the forums and chat_.

**Table of Contents**

<!-- toc -->

- [Description](#description)
- [Local Development](#local-development)
  - [Installation Script](#installation-script)
  - [Template Codebase](#template-codebase)
  - [How to run create-redwood-app and create a project](#how-to-run-create-redwood-app-and-create-a-project)
  - [Develop using the new project](#develop-using-the-new-project)

## Description

This package creates and installs a Redwood project, which is the entry point for anyone using Redwood. It has two parts:

- The installation script [`src/create-redwood-app.js`](./src/create-redwood-app.js)
- Project template code in the [`templates/`](./templates/) directory

## Local Development

### Installation Script

The installation script is built with [Yargs](https://github.com/yargs/yargs).

### Template Codebase

The project codebase in [`templates/`](./templates/) uses [Yarn Workspaces](https://yarnpkg.com/features/workspaces) for a monorepo project containing the API and Web Sides. Redwood packages are included in `templates/ts/package.json`, `templates/ts/web/package.json`, and `templates/ts/api/package.json`, respectively.

### How to run `create-redwood-app` from your local repo and create a project

First, run the following commands in the root of the monorepo:

```bash
yarn install
yarn build
```

Then, navigate to the create redwood app package:

```bash
cd packages/create-redwood-app
```

Run `yarn node` on the built file (`dist/create-redwood-app.js`) and pass in the path to the new project:

```bash
yarn node ./dist/create-redwood-app.js /path/to/new/redwood-app
```

> [!NOTE]
> the new project will install with the most recent major Redwood package version by default.

### How to run other published versions for debugging

By default yarn create will pick the latest stable version to run, but you can specify a different version via yarn too!

To try the canary version, run:

```
npx create-redwood-app@canary /path/to/project
```

Note that this will still create a project with the latest stable version, but run the canary version of create-redwood-app, and is mainly useful for debugging this package, and not the redwood canary release.

You can specify any tag or version instead of `@canary`

### Develop using the new project

There are three options for developing with the installed project:

**1. Upgrade the project to use the latest canary release**

```bash
cd /path/to/new/redwood-app
yarn rw upgrade -t canary
```

**2. Use the workflow and tools for local package development**

- [Local Development Instructions](https://github.com/redwoodjs/redwood/blob/main/CONTRIBUTING.md)
