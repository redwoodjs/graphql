# RedwoodJS CLI

  <!-- toc -->

- [Purpose and Vision](#purpose-and-vision)
- [Package Leads](#package-leads)
- [Roadmap](#roadmap)
  - [Coming Soon](#coming-soon)
  - [Coming Later](#coming-later)
- [Contributing](#contributing)
  - [Overview](#overview)
  - [Best Practices](#best-practices)
  - [Adding a Command](#adding-a-command)
    - [command](#command)
    - [description](#description)
    - [builder](#builder)
    - [handler](#handler)
  - [Adding an Entry Point Command](#adding-an-entry-point-command)
  - [Adding a Generator](#adding-a-generator)
    - [createYargsForComponentGeneration](#createyargsforcomponentgeneration)
    - [yargsDefaults](#yargsdefaults)
    - [Testing Generators](#testing-generators)
    - [Adding a Destroyer](#adding-a-destroyer)
  - [Adding a Provider to the Auth Generator](#adding-a-provider-to-the-auth-generator)
  - [dbCommands](#dbcommands)
  - [Converting to TypeScript](#converting-to-typescript)
    - [Generators](#generators)
  - [What about...](#what-about)
    - [index.js](#indexjs)
    - [src/lib/colors.js](#srclibcolorsjs)
- [FAQ](#faq)
  - [I want to alias `yarn rw`](#i-want-to-alias-yarn-rw)
  - [Can I customize the generators?](#can-i-customize-the-generators)

## Purpose and Vision

Redwood provides a first-class CLI that helps you at every stage of development, from your first commit to your first deploy. And it comes with Redwood, which means no extra software to install!

Redwood uses [yarn workspaces](https://yarnpkg.com/features/workspaces) to separate your app's sides, generators to give you a smooth DX, and [Prisma](https://www.prisma.io/) to manage your database. We have a generator for nearly everything, on both sides of the app, from components to functions.

Since the CLI is the entry point to Redwood, as Redwood continues to grow&mdash;especially as we add more sides and targets&mdash;so will the CLI.

## Package Leads

- [@cannikin](https://github.com/cannikin)
- [@peterp](https://github.com/peterp)
- [@thedavidprice](https://github.com/thedavidprice)

## Roadmap

### Coming Soon

- [Generators refactor (plopjs)](https://github.com/redwoodjs/redwood/issues/653)

### Coming Later

- [Multiple database support](https://github.com/redwoodjs/redwood/issues/507)
- [Support for dynamic sides and targets](https://github.com/redwoodjs/redwood/pull/355)

## Contributing

Redwood's CLI is built with [Yargs](http://yargs.js.org/).
If you aren't familiar with it, we walk you through what you need to know in the [Adding a Command](#adding-a-command) section. But if you already are, know that we use the [advanced api](https://github.com/yargs/yargs/blob/master/docs/advanced.md). This means that instead of seeing things written as a method chain, with the `command` method doing most of the work, like:

```javascript
yargs
  .command(
    'get',
    'make a get HTTP request',
    function (yargs) {
      return yargs.option('u', {
        alias: 'url',
        describe: 'the URL to make an HTTP request to',
      })
    },
    function (argv) {
      console.log(argv.url)
    },
  )
  .help().argv
```

you'll see the arguments to the `command` method spread across exported constants, like:

```javascript
export const command = 'get'
export const description = 'make a get HTTP request'
export const builder = (yargs) => {
  return yargs.option('u', {
    alias: 'url',
    describe: 'the URL to make an HTTP request to',
  })
}
export const handler = (argv) => {
  console.log(argv.url)
}
```

### Overview

Contributing to `@redwoodjs/cli` usually means adding a command or modifying an existing one. We've organized this doc around adding a command since if you know how to do this you'll know how to modify one too.

#### Quickstart

RedwoodJS CLI is usually run in a project, this is problematic for contributors, because the transpiled files are not in a project, but in the RedwoodJS framework repo. Luckily the path can be modified at run-time via an env-var: `RWJS_CWD=../path/to/project`.

We've added a handy yarn alias to test your modified changes to the Redwood CLI against the "example-todo-main" fixture (`__fixtures__/example-todo-main`) you can do the following:

```terminal
cd packages/cli
yarn dev <command>
```

> **Note:** If you are implementing a command and wish to run via `yarn dev <command>` be sure to `yarn build:clean-dist` beforehand to run the latest version.

> **Important:** If your command alters the `example-todo-main` project (adds a package, modifies redwood.toml, etc) be sure not to commit and push those changes as part of your PR.

### Best Practices

There's a few best practices we follow that you should be aware of:

- **Use `description` instead of `desc` or `describe`:** While yargs accepts any of these, for consistency, use `description`
- **descriptions shouldn't end in periods:** Again, just a stylistic choice&mdash;but stick to it!
- **`builder` should be a function:** This enables the positional api (more on that [later](#builder))
- **Update the docs and test:** By docs, we mean the content on redwoodjs.com. We know this can be a lot, so don't feel like you have to do it all yourself. We're more than happy to help&mdash;just ask us!

If none of these make sense yet, don't worry! You'll see them come up in the next section, where we walk you through adding a command.

### Adding a Command

You can add a command by creating a file in [./src/commands](https://github.com/redwoodjs/redwood/tree/main/packages/cli/src/commands). Although it's not necessary, for consistency, the file should be named after the command that invokes it. For example, the build command, which is invoked with

```terminal
yarn rw build
```

lives in [./src/commands/build.js](https://github.com/redwoodjs/redwood/blob/main/packages/cli/src/commands/build.js).

To make a command using the advanced api, yargs requires that you export [four constants](https://github.com/yargs/yargs/blob/master/docs/advanced.md#providing-a-command-module):

| Constant      | Type     | Description                                                                   |
| :------------ | :------- | :---------------------------------------------------------------------------- |
| `command`     | string   | A yargs command definition. You specify the command's name and arguments here |
| `description` | string   | A description of the command; shown in the help message                       |
| `builder`     | function | Effectively "builds" the command's arguments/options                          |
| `handler`     | function | The function invoked by the command; does all the work                        |

We'll continue to use the build command as an example as we discuss each of these individually.

#### command

`command` is a string that represents the command at the CLI and effectively maps it to the handler that does the work.

The command for `build` is:

```javascript
export const command = 'build [side..]'
```

`'build'` specifies the name of the command and `'[side..]'` indicates that `build` takes an optional positional argument (named `side`&mdash;relevant for `builder` and `handler`). The dots (`..`) trailing `side` indicate that you can provide an array of strings (see [Variadic Positional Arguments](https://github.com/yargs/yargs/blob/master/docs/advanced.md#variadic-positional-arguments)):

```terminal
yarn rw build api web
```

See [Positional Arguments](https://github.com/yargs/yargs/blob/master/docs/advanced.md#positional-arguments) for all your options when it comes specifying arguments for commands.

#### description

`description` is a string that's shown in the help output. `build`'s description is

```javascript
export const description = 'Build for production'
```

Running `yarn rw build help` displays:

```terminal
rw build [side..]

Build for production

...
```

Other than that, there's not much more to it. You should of course make the description descriptive. And for consistency, don't punctuate it. I.e., we prefer this

```javascript
export const description = 'Build for production'
```

to this

```javascript
export const description = 'Build for production.'
```

#### builder

`builder` configures the positional arguments and options for the command.

While `builder` can be an object, the [positional argument api](https://yargs.js.org/docs/#api-positionalkey-opt) is only available if builder is a function. But that doesn't mean we can't use an object to "build" `builder`. As you'll see in [yargsDefaults](#yargsdefaults), this is what we do with commands that share a lot of options.

Here's an excerpt of `build`'s `builder`:

```javascript
// ./src/commands/build.js

export const builder = (yargs) => {
  yargs
    .positional('side', {
      choices: ['api', 'web'],
      default: optionDefault(apiExists, webExists),
      description: 'Which side(s) to build',
      type: 'array',
    })

    ...
```

Using `positional`, you can configure `side` (which was was "defined" earlier in [command](#command)): what values the user's allowed to pass (`choices`), what `side` defaults to if the user passes nothing (`default`), etc.

You should always specify `description` and `type`. The rest depends. But generally, if you can specify more, you should.
For the full list of what properties you can use to compose the options object, see [.positional(key, opt)](https://yargs.js.org/docs/#api-positionalkey-opt). But know that besides `alias` and `choices`, we haven't had the occasion to use anything else.

While `side` would've worked in a bare-bones sort of way if we didn't use `positional`, `builder` is the only way to let the command know about its options (only showing the relevant bits here):

```javascript
// ./src/commands/build.js

export const builder = (yargs) => {
  yargs

    ...

    .option('stats', {
      default: false,
      description: `Use ${terminalLink(
        'Webpack Bundle Analyzer',
        'https://github.com/webpack-contrib/webpack-bundle-analyzer'
      )}`,
      type: 'boolean',
    })
    .option('verbose', {
      alias: 'v',
      default: false,
      description: 'Print more',
      type: 'boolean',
    })

    ...

}
```

These two calls to `options` configure this command to have options `--stats` and `--verbose`:

```terminal
yarn rw build --stats
yarn rw build --verbose
```

For the full list of what properties you can use to compose the options object, see [options(key, [opt])](https://yargs.js.org/docs/#api-optionskey-opt).

#### handler

`handler`'s what actually does the work of the command. It's where all the logic goes.

More concretely, `handler`'s a function that gets passed the positional arguments and options specified and configured in `command` and `builder`&mdash;the parsed `argv`.

While `build`'s `handler` is too long to reproduce here in full, to get the point across, here's the signature:

```javascript
// ./src/cli/commands/build.js

export const handler = async ({
  side = ['api', 'web'],
  verbose = false,
  stats = false,
}) => {

  ...

}
```

The logic that goes in a command's `handler` varies too much to comment on generally. But you'll see similarities among commands that do similar things, like generators.

### Adding an Entry Point Command

If you're adding a command that serves as an entry point to more commands, like `db`, `destroy`, and `generate`, you'll want to create

1. a file for the command in `./src/commands`, like in [Adding a Command](#adding-a-command), and
2. a directory to store all the commands it serves as an entry point to.

Although it's not necessary, for consistency, the file and directory should be named after the command that invokes them. Using the generate command as an example, in `./src/commands`, there's the file [generate.js](https://github.com/redwoodjs/redwood/blob/main/packages/cli/src/commands/generate.js) and the directory [generate](https://github.com/redwoodjs/redwood/tree/main/packages/cli/src/commands/generate).

Files for entry-point commands typically aren't too complicated. Here's the contents of `generate.js` in its entirety:

```javascript
export const command = 'generate <type>'
export const aliases = ['g']
export const description = 'Save time by generating boilerplate code'
import terminalLink from 'terminal-link'

export const builder = (yargs) =>
  yargs
    .commandDir('./generate', { recurse: true })
    .demandCommand()
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#generate-alias-g',
      )}`,
    )
```

The call to `commandDir` is what makes this command an entry point. You can read more about `commandDir` [here](https://github.com/yargs/yargs/blob/master/docs/advanced.md#commanddirdirectory-opts). The second argument to `commandDir`, `{ recurse: true }`, is specific to the `generate` command because each of the commands in the `generate` directory is in its own directory to keep things organized&mdash;more on this in [Adding a Generator](#adding-a-generator).

Now all the commands in the `generate` directory will be arguments to the `generate` command:

```
./src/commands/generate
├── auth
├── cell
├── component
├── function
├── helpers.js
├── layout
├── page
├── README.md
├── scaffold
├── sdl
├── service
└── __tests__
```

There are files and directories here that aren't yargs related (`README.md`, `helper.js`, and `__tests__`), but because yargs will only use the files that export the appropriate constants, that's ok.

### Adding a Generator

> We're about to refactor generators out of @redwoodjs/cli and into their own package, so some of this section will probably change soon.

You can add a generator by creating a directory and a file in that directory in [./src/commands/generate](https://github.com/redwoodjs/redwood/tree/main/packages/cli/src/commands/generate).
Although it's not necessary, for consistency, the directory and file should be named after the command that invokes them.
For example, the page generator, which is invoked with

```
yarn redwood generate page
```

lives in [./src/commands/generate/page/page.js](https://github.com/redwoodjs/redwood/blob/main/packages/cli/src/commands/generate/page/page.js), where the `page` directory has the following structure:

```terminal
src/commands/generate/page
├── page.js
├── templates
└── __tests__
```

Since a typical generator writes files, needs templates to do so, and needs tests to ensure it works, we use this command-in-a-directory structure to keep things organized.

The templates for the files created by generators go in `templates`. They should be named after the file they create and end in `.template` to avoid being compiled by Babel:

```terminal
src/commands/generate/page/template
├── page.js.template
└── test.js.template
```

The templates are processed with lodash's [template](https://lodash.com/docs#template) function. You can use ES template literal delimiters (`${}`) as interpolation delimiters:

```javascript
// ./src/commands/generate/page/template/page.js.template

const ${singularPascalName}Page = () => {

...
```

The variables referenced in the template must be named the same as what's passed to the `generateTemplate` function, which is usually wrapped in a few functions, but accessible via the respective generator's `files` function.

The `files` function is what actually generates the files. Every generator has one. They use a helper, `templateForComponentFiles`, which takes care of the logic around creating an output path and contents.

The `...rest` parameter from `files` gets passed to this function's `templateVars` parameter which gets passed to `generateTemplate` for interpolation:

```javascript
// ./src/commands/generate/page/page.js

export const files = ({ name, ...rest }) => {
  const pageFile = templateForComponentFile({
    name,
    suffix: COMPONENT_SUFFIX,
    webPathSection: REDWOOD_WEB_PATH_NAME,
    generator: 'page',
    templatePath: 'page.js.template',
    templateVars: rest,
  })
```

For the actual writing of files to disk, generators call on a function from [src/lib/index.js](https://github.com/redwoodjs/redwood/blob/main/packages/cli/src/lib/index.js): [writeFilesTask](https://github.com/redwoodjs/redwood/tree/main/packages/cli/src/lib/index.js#L252-L263).

More complicated generators, like auth, will have a little more logic in their directories:

```terminal
src/commands/setup/auth
├── auth.js
├── providers
├── templates
└── __tests__
```

#### createYargsForComponentGeneration

There's another helper you'll see being used fairly often: [createYargsForComponentGeneration](https://github.com/redwoodjs/redwood/tree/main/packages/cli/src/commands/generate/helpers.js#L67-L131).

This function takes care of some of the boilerplate around yargs commands by creating the four constants&mdash;`command`, `description`, `builder`, and `handler`&mdash;for you.

It has four parameters:

- `componentName`: a string, like `'page'`
- `filesFn`: a function, usually the one called `files`
- `optionsObj`: an object, used to construct `options` for yargs. Defaults to [yargsDefaults](#yargsdefaults)
- `positionalsObj`: an object, used to construct `positionals` for yargs.

The idea here's to export as many constants as you can straight from `createYargsForComponentGeneration`'s returns:

```javascript
// src/commands/generate/cell/cell.js

export const { command, description, builder, handler } =
  createYargsForComponentGeneration({
    componentName: 'cell',
    filesFn: files,
  })
```

But you can use `createYargsForComponentGeneration` even if you don't plan on using all its return values. For example, the component generator uses `command`, `builder`, and `handler`, but doesn't destructure `description` and exports its own instead:

```javascript
// ./src/commands/generate/component/component.js

export const description = 'Generate a component'

export const { command, builder, handler } = createYargsForComponentGeneration({
  componentName: 'component',
  filesFn: files,
})
```

#### yargsDefaults

If you find yourself not using the `builder` from `createYargsForComponentGeneration` (or just not using `createYargsForComponentGeneration` at all), you should use `yargsDefaults`.

<!-- [todo] -->
<!-- Link when merged -->

`yargsDefaults` is an object that contains all the options common to generate commands. It's defined in `generate.js`, the generator entry-point command. So importing it usually looks like:

```javascript
import { yargsDefaults } from '../../generate'
```

<!-- kind of a bad name -->

We use `yargsDefaults` to "build" the builder. The generate sdl command is a good example. In sdl.js (which is in the generate directory in ./src/commands) `yargsDefault` is spread into another object, `defaults` (the name of this object is another convention):

```javascript
// ./src/commands/generate/sdl/sdl.js

export const defaults = {
  ...yargsDefaults,
  crud: {
    default: false,
    description: 'Also generate mutations',
    type: 'boolean',
  },
}
```

This way we can define an option specific to the sdl generator (`crud`) while still getting all the options common to generators.

But `defaults` isn't `builder`&mdash;`builder` has to be a function (and named `builder`), so in `builder`, you can use the following pattern to incorporate `defaults`:

```javascript
export const builder = (yargs) => {
  yargs
    .positional('model', {
      description: 'Model to generate the sdl for',
      type: 'string',
    })
    .epilogue(
      `Also see the ${terminalLink(
        'Redwood CLI Reference',
        'https://redwoodjs.com/docs/cli-commands#generate-sdl',
      )}`,
    )
  Object.entries(defaults).forEach(([option, config]) => {
    yargs.option(option, config)
  })
}
```

#### Testing Generators

If you're adding a generator or modifying an existing one, you're gonna wanna test it. (Well, at least we want you to.)

Along with a command file and a `templates` directory, most generators have a `__tests__` directory:

```terminal
src/commands/generate/page
├── page.js
├── templates
└── __tests__
```

Generally, `__tests__` has at least one test file and a `fixtures` directory. For example, `pages/__tests__` has `page.test.js` and `fixtures`:

```terminal
src/commands/generate/page/__tests__
├── page.test.js
└── fixtures
```

Fixtures are necessary because generators create files, and to test commands that create files, we need something to compare them to.

You can use `loadGeneratorFixture` to load the appropriate fixture to test against.
It takes two arguments: the name of the generator and the name of the fixture. We usually use it to check to see that the files are equal:

```javascript
// ./src/packages/cli/src/commands/generate/page/__tests__/page.test.js

test('creates a page component', () => {
  expect(
    singleWordFiles[
      path.normalize('/path/to/project/web/src/pages/HomePage/HomePage.js')
    ],
  ).toEqual(loadGeneratorFixture('page', 'singleWordPage.js'))
})
```

#### Adding a Destroyer

If you're adding a generator, it'd be great if you added its evil twin, a destroyer, too.

Destroyers rollback the changes made by generators. They're one-to-one, in that, for a cell generator there's a cell destroyer.

Just like generators, destroyers have helpers that minimize the amount of boilerplate you have to write so you can get straight to the custom, creative logic. They're similarly named too: `createYargsForComponentDestroy` is one that, like for generators, you should use if permitting. And you probably will for `builder` at least, since, so far, destroyers don't have any options.

And just like generators, destroyers have tests. Right now, the way we test destroyers is by comparing the files that the generator produces with the files the destroyer attempts to delete. But because we don't actually want to write files to disk, we mock the api required to run the generator's `files` function, which is what you'll see going in the top-level [`__mocks__`](https://github.com/redwoodjs/redwood/blob/main/packages/cli/__mocks__/fs.js) directory. To do this, we use Jest's [manual mocking](https://jestjs.io/docs/en/manual-mocks.html) to mock NodeJS's `fs` module.

### Adding a Provider to the Auth Generator

Adding a provider to the auth generator is as easy as adding a file in [./src/commands/setup/auth/providers](https://github.com/redwoodjs/redwood/tree/main/packages/cli/src/commands/setup/auth/providers) that exports the four constants: `config`, `webPackages`, `apiPackages` and `notes`.

> Note that the provider you are about to add has to have already been implemented in `@redwoodjs/auth`. For example, the provider in the example below, Netlify Identity, is implemented [here](https://github.com/redwoodjs/redwood/blob/main/packages/auth/src/authClients/netlify.ts).
>
> So if you haven't done that yet, start with [this doc](https://github.com/redwoodjs/redwood/blob/main/packages/auth/README.md#contributing), then come back to this section afterwards.

We'll use the [Netlify Identity](https://github.com/redwoodjs/redwood/blob/main/packages/cli/src/commands/setup/auth/providers/netlify.js) provider as an example to discuss these requirements:

```javascript
// ./src/commands/setup/auth/providers/netlify.js

// the lines that need to be added to App.{jsx,tsx}
export const config = {
  imports: [
    `import netlifyIdentity from 'netlify-identity-widget'`,
    `import { isBrowser } from '@redwoodjs/prerender/browserUtils'`,
  ],
  init: 'isBrowser && netlifyIdentity.init()',
  authProvider: {
    client: 'netlifyIdentity',
    type: 'netlify',
  },
}

// required packages to install
export const webPackages = ['netlify-identity-widget']
export const apiPackages = []

// any notes to print out when the job is done
export const notes = [
  'You will need to enable Identity on your Netlify site and configure the API endpoint.',
  'See: https://github.com/netlify/netlify-identity-widget#localhost',
]
```

`config` is an object that contains everything that needs to be inserted into a Redwood app's `./web/src/index.js` to setup the auth provider and make it available to the router. It has three properties: `imports`, `init`, and `authProvider`.

`imports` is an array of strings that lists any imports that need to be added to the top of `./web/src/index.js`. Any initialization code that needs to go after the `import` statements goes in `init`. And `authProvider` is an object that contains exactly two keys, `client` and `type` that will be passed as props to `<AuthProvider>`.

The next required exports, `webPackages` and `apiPackages` each contain an array of strings of the packages that need to be added to the web, respectively api workspace's `package.json`.

Lastly, `notes` is an array of strings to output after the generator has finished, instructing the user through any further required setup (like setting ENV vars). Each string in the array will output on its own line.

### dbCommands

<!-- TODO -->
<!-- This might need updated soon... -->
<!-- https://github.com/redwoodjs/redwood/pull/661#issuecomment-644146059 -->

Most of the commands in `dbCommands` are just wrappers around [Prisma commands](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-cli/command-reference),
the exception being `seed`, which runs a Redwood app's [./api/prisma/seed.js](https://github.com/redwoodjs/create-redwood-app/blob/master/api/prisma/seeds.js).

Adding or modifying a command here's no different&mdash;there's still a `command`, `description`, `builder`, and `handler`. But there's a pattern to `handler`: it usually uses [runCommandTask](https://github.com/redwoodjs/redwood/blob/d51ade08118c17459cebcdb496197ea52485364a/packages/cli/src/lib/index.js#L349-L377), a Redwood-defined function.

This is because most `dbCommands` are really just running prisma commands, so they really just have to output something like `yarn prisma ...`.

#### Generators

If you're converting a generator, read the _Goals_ section of tracking issue [#523](https://github.com/redwoodjs/redwood/issues/523); it details some specs you should comply with.

Some of the generators have already been converted; use them as a reference (linking to the PRs here):

- [component](https://github.com/redwoodjs/redwood/pull/632)
- [sdl](https://github.com/redwoodjs/redwood/pull/515)
- [services](https://github.com/redwoodjs/redwood/pull/515)

For most of the generate commands, the option (in the builder) for generating a typescript file is already there, either in the builder returned from `createYargsForComponentGeneration` or in `yargsDefaults` (the former actually uses the latter).

### What about...

Because it's where most of the action is, most of this doc has been about the `src/commands` directory. But what about all those other files?

```
redwood/packages/cli
├── jest.config.js
├── __mocks__
├── package.json
├── README.md
└── src
    ├── commands
    ├── index.d.ts
    ├── index.js
    └── lib
```

#### index.js

[index.js](https://github.com/redwoodjs/redwood/blob/main/packages/cli/src/index.js) is the `rw` in `yarn rw`. It's the entry-point command to all commands, and like other entry-point commands, it's not too complicated.

But it's distinct from the others in that it's the only one that has a shebang at the top and `argv` at the bottom:

```javascript
// ./src/index.js

#!/usr/bin/env node

...

  .demandCommand()
  .strict().argv
```

We also use methods that we want to affect all commands here, like `demandCommand` and `strict`.

#### lib/colors.js

[colors.js](https://github.com/redwoodjs/redwood/blob/main/packages/cli/src/lib/colors.js) provides a declarative way of coloring output to the console using [chalk](https://github.com/chalk/chalk#styles). You'll see it imported like:

```javascript
import c from '../lib/colors'
```

And used mainly in catch statements, like:

```javascript
try {
  await t.run()
} catch (e) {
  console.log(c.error(e.message))
}
```

We only use `error` right now, like in the example above, but you can use `warning`, `green`, and `info` as well:

![rw-colors](https://user-images.githubusercontent.com/32992335/84069820-fedc1b80-a97f-11ea-9f26-c81946064a99.png)

Adding a new color is as simple as adding a new property to the default export:

```javascript
// ./src/lib/colors.js

export default {
  error: chalk.bold.red,
  warning: chalk.keyword('orange'),
  green: chalk.green,
  info: chalk.grey,
}
```

## FAQ

### I want to alias `yarn rw`

You're not the only one. See the discussion [here](https://github.com/redwoodjs/redwood/issues/328).

### Can I customize the generators?

Not yet, but we're talking about it! See the ongoing discussions in these issues:

- Investigate integrating or replacing generators with Plop [#653](https://github.com/redwoodjs/redwood/issues/653)
- BYO Components to Scaffold Generator [#473](https://github.com/redwoodjs/redwood/issues/473)
