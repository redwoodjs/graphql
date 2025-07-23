---
title: TypeScript in Redwood
description: Getting started & Core Concepts
---

Redwood comes with full TypeScript support, and you don't have to give up any of the conveniences that Redwood offers to enjoy all the benefits of a type-safe codebase.

## Getting Started

### Starting a Redwood Project in TypeScript

You can use the `--typescript` option on `yarn create redwood-app` to use TypeScript from the start:

```shell
yarn create redwood-app my-redwood-app --typescript
```

### Converting a JavaScript Project to TypeScript

Started your project in JavaScript but want to switch to TypeScript?
Start by using the `tsconfig` setup command:

```shell
yarn rw setup tsconfig
```

This adds `tsconfig.json` files to both the web and the api side, telling VSCode that this's a TypeScript project.
(You can go ahead and remove the `jsconfig.json` files from both sides now.)

You don't need to convert all your JavaScript files to TypeScript right away.
In fact, you probably shouldn't.
Do it incrementally.
Start by renaming your files from `.js` to `.ts`. (Or, if they have a React component, `.tsx`.)

## Core Concepts

### 1. Automatic types

When you're developing in TypeScript, the Redwood CLI is your trusted companion—focus on writing code and it'll generate as many of the types as it can.
When you run `yarn rw dev`, the CLI watches files for changes so that it can generate types.
(More on this in the [Generated Types](/typescript/generated-types.md) doc.)

But let's say that you don't have the dev server running, and are just coding and notice missing types.
You can always run `yarn rw g types` to make sure you have all the types you need.

### 2. Use generators to learn about available utility types

Let's say you generate a Cell using the command `yarn rw g cell Post`. If your project is in TypeScript, the generated files will contain a bunch of utility types (imported from `@redwoodjs/web`), as well as types specific to your project (imported from `types/graphql`).
You don't need to learn all the utility types up front, but they're documented in detail in the [Utility Types](/typescript/utility-types.md) doc when you're ready.

### 3. Redwood won't force you to type everything

The Redwood philosophy is to keep things as simple as possible at first. Redwood generates as much as possible, avoids forcing you to type every little detail, and doesn't have [strict mode](https://www.typescriptlang.org/tsconfig#strict) on by default.
Where needed (e.g. the [`DbAuthHandler`](/typescript/utility-types.md#dbauthhandleroptions)) you can make use of generics to be more specific with your types.

But if you're comfortable with TypeScript and want that extra level of safety, take a look at our [Strict Mode](/typescript/strict-mode.md) doc.

## A Few Useful Tips

### Sharing Types between Sides

To share types between sides:

1. Put them in a directory called `types` at the root of your project (you may have to create this directory)
2. Restart your editor's TypeScript server. In VSCode, you can do this by running the "TypeScript: Restart TS server" command via the command palette (make sure you're in a `.js` or `.ts` file)

### Running Type Checks

Behind the scenes, Redwood actually uses Babel to transpile TypeScript.
This's why you're able to convert your project from JavaScript to TypeScript incrementally, but it also means that, strictly speaking, dev and build don't care about what the TypeScript compiler has to say.

That's where the `type-check` command comes in:

```
yarn rw type-check
```

This runs `tsc` on your project and ensures that all the necessary generated types are generated first. Checkout the [CLI reference for type-check](cli-commands.md#type-check)

### Using Alias Paths

Alias paths are a mechanism that allows you to define custom shortcuts or aliases for import statements in your code. Instead of using relative or absolute paths to import modules or files, you can use these aliases to make your imports cleaner and more concise.

Redwood comes with a great starting point by aliasing the `src` directory, but you can take this further by configuring your `tsconfig.json` file, your import paths could go from:

```ts
// this really long path
import { CustomModal } from 'src/components/modules/admin/common/ui/CustomModal'

// to this nicer one!
import { CustomModal } from '@adminUI/CustomModal'
```

Add you custom `@adminUI` alias to your `tsconfig.json` file:

```json
{
  "compilerOptions": {
...
    "paths": {
      "src/*": ["./src/*", "../.redwood/types/mirror/api/src/*"],

      "@adminUI/*": [
        "./src/components/modules/admin/common/ui/*",
        "../.redwood/types/mirror/web/src/components/modules/admin/common/ui/*"
      ],

      "types/*": ["./types/*", "../types/*"],
      "@redwoodjs/testing": ["../node_modules/@redwoodjs/testing/api"]
    }
  }
...
}
```

You might have noticed the `"../.redwood/types/mirror/web/src/components/modules/admin/common/ui/*"` path. I'm glad you did!

When you build your project redwood will create a set of directories or a virtual directory called`.redwood`, [read more about this typescript feature here](https://www.typescriptlang.org/docs/handbook/module-resolution.html#virtual-directories-with-rootdirs). This directory contains types for te Cells, so there is no need for us to specify an index file.

When you combine those two paths `.src/...` and `./.redwood/...` under an alias you can have shorter and cleaner import paths:

```ts
// Instead of this 🥵
import { CustomModal } from 'src/components/modules/admin/common/ui/CustomModal/CustomModal'

// they could look like this ✨
import { CustomModal } from '@adminUI/CustomModal'
```

#### Some benefits of using alias paths are

1. **Improved code readability**, by abstracting complex directory hierarchies, and having meaningful names for your imports.
1. **Code maintainability**, aliases allow you to decouple your code from the file structure and more easily move files around, as they are not tied to the longer path.
1. **Reduce boilerplate**, no more `../../src/components/modules/admin/common/ui/` 😮‍💨

When you start writing tests for components that contain alias paths, you will need to add the following to your Jest configuration in `jest.config.js`:

```js
const config = {
  rootDir: '../',
  preset: '@redwoodjs/testing/config/jest/web',
  moduleNameMapper: {
    '^@adminUI/(.*)$':
      '<rootDir>/web/src/components/modules/admin/common/ui/$1',
  },
}

module.exports = config
```

:::info
There are 3 `jest.config.js` files within a Redwood project. There's one inside the `web` directory, one inside the `api` directory, and one at the root of the project. Since the alias I created is used within the `web` directory, I added the `moduleNameMapper` to the `jest.config.js` file within the `web` directory.
:::
