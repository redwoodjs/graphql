# Codemods

- [Codemods](#codemods)
  - [Purpose and Vision](#purpose-and-vision)
  - [Package Leads](#package-leads)
  - [Contributing](#contributing)

## Purpose and Vision

This package contains codemods that automate upgrading a Redwood project.

## Package Leads

- Daniel Choudhury (@dac09)
- Dominic Saadi (@jtoar)

## Usage

Listing available codemods:

```shell
npx @redwoodjs/codemods list v0.38.x
```

Applying a single one:

```shell
npx @redwoodjs/codemods add-directives
```

---

## Contributing

> **Note** that this is a CLI—that is, it's meant to be executed with `npx`. This means the normal contribution flow (using `rwfw`) doesn't apply.

You should be familiar with [jscodeshift](https://github.com/facebook/jscodeshift).
Its API isn't documented too well so we'll try to explain some of it here.

Like Babel and ESLint, jscodeshift is all about ASTs.
The difference is that it's overwriting files.
That means things that Babel doesn't care about, like spaces, styling (single quotes or double quotes, etc.), all of a sudden matter a lot.
The parser jscodeshift uses, [recast](https://github.com/benjamn/recast), knows how to preserve these details as much as possible.

### Generating a new Codemod

```shell
cd packages/codemods
yarn generate:codemod
```

Follow the interactive guide to specify the Redwood framework version for the codemod and type of codemod.

### Structure of this package

The root of the CLI is run from `src/codemods.ts`, which loads all the available codemods from the `src/codemods/*` folder.

Codemods are organised by version. For example, for upgrading from v0.37.x -> v0.38.x, the codemods are in the `src/codemods/v0.38.x` folder.

Each codemod has the following files:

- README.md—to explain what this codemod does
- {codemodName}.ts—this is the actual implementation of the codemod. You can export whatever you like here, and use it in the yargs handler
- {codemodName}.yargs.ts—this is the yargs (CLI) handler that actually invokes your codemod. Each of the yargs handlers should export: `command`, `description` and `handler` at least. More info on how this is handled with yargs `commandDir` here: [Yargs advanced docs](https://github.com/yargs/yargs/blob/main/docs/advanced.md#commanddirdirectory-opts)
- {codemodName}.test.ts—all jscodeshift codemods should implement a test. They're fairly simple to write. Have a look at the testing section for more details

### Different types of codemods

Codemods are sometimes really simple, e.g. just normal string replace or updating a package.json. But other times we use jscodeshift to change code on a redwood project

Here are a few different examples to help you get familiarised:

- [Rename config in Redwood.toml](packages/codemods/src/codemods/v0.38.x/renameApiProxyPath)—
  Simple string replace on the user's `redwood.toml`. No ASTs, no complications!

- [Add Directives](packages/codemods/src/codemods/v0.37.x/addDirectives)—
  Download files from the RedwoodJS template because we've added new files that are needed in a user's project. No ASTs involved

- [Update GraphQL Function](packages/codemods/src/codemods/v0.37.x/updateGraphQLFunction)—
  A more complex example, which uses `jscodeshift` and ASTs to update code in a user's project

The rest of the docs will focus on the more complex cases (the third example).

### A Typical Transform

A typical transform looks something like this:

```typescript
// fooToBar.ts

import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift

  const root = j(file.source)

  return root.findVariableDeclarators('foo').renameTo('bar').toSource()
}
```

You can then run this transform on files via the CLI:

```
yarn run jscodeshift -t fooToBar.ts foo.js
```

In this way, jscodeshift is similar to Jest in that it's a runner.

> 💡 **Tip**
>
> An extremely useful tool to write the actual transform is [ASTExplorer](https://astexplorer.net/).
> This lets you see how your codemods change input source, in real time!

#### The API

In the example above, `file` is the file it's running the transformation on
and `jscodeshift` itself is actually a property of `api`.
Since it's used so much, you'll see this pattern a lot:

```javascript
const j = api.jscodeshift
```

`j` exposes the whole api, but it's also a function—it parses its argument into a `Collection`, jscodeshift's major type. It's similar to a javascript array and has many of the same methods (`forEach`, `map`, etc.).
The best way to familiarize yourself with its methods is to either 1) look at a bunch of examples or 2) [skim the source](https://github.com/facebook/jscodeshift/blob/main/src/Collection.js).

### Writing a transform

When beginning to write a transform, your best bet is to start by pasting the code you want to transform into [AST Explorer](https://astexplorer.net/). Use it to figure out what node you want, and then use one of `jscodeshift`'s `find` methods to find it:

````typescript
import type { FileInfo, API } from 'jscodeshift'

export default function transform(file: FileInfo, api: API) {
  const j = api.jscodeshift

  const root = j(file.source)

  /**
   * This finds the line:
   *
   * ```
   * import { ... } from '@redwoodjs/router'
   * ```
   */
  return root.find(j.ImportDeclaration, {
    source: {
      type: 'Literal',
      value: '@redwoodjs/router',
    },
  })
}
````

Sometimes `jscodeshift` has a more-specific find method than `find`, like `findVariableDeclarators`. Use it when you can—it makes things a lot easier.
But note that these find methods aren't on `Collection`.
They're in the extensions:

- [Node](https://github.com/facebook/jscodeshift/blob/main/src/collections/Node.js)
- [JSXElement](https://github.com/facebook/jscodeshift/blob/main/src/collections/JSXElement.js)
- etc.

After you find what you're looking for, you usually want to replace it with something else.
Again, use AST Explorer to find out what the AST of that something else is.
Then, instead of using a type (like `j.ImportDeclaration`) to find it, use a builder (like `j.importDeclaration`—it's just the type camelcased) to make it.

Again, sometimes jscodeshift has a method that makes this trivial, especially for simple operations, like renaming or removing something (just use `renameTo` or `remove`).
But sometimes you'll just have to use one of the more generic methods: `replaceWith`, `insertBefore`, `insertAfter`, etc.

## Testing

Although jscodeshift has a built-in way of doing testing, we have a slightly different way of testing.

There are 3 key test utils you need to be aware of (located in [packages/codemods/testUtils/index.ts](https://github.com/redwoodjs/redwood/blob/main/packages/codemods/testUtils/index.ts)).

1. `matchTransformSnapshot`—this lets you give it a transformName (i.e. the transform you're writing), and a fixtureName. The fixtures should be located in `__testfixtures__`, and have `{fixtureName}.input.{js,ts}` and `{fixtureName}.output.{js,ts}` files.

Note that the fixtureName can be anything you want, and you can have multiple fixtures.

```js
describe('Update API Imports', () => {
  it('Updates @redwoodjs/api imports', async () => {
    await matchTransformSnapshot('updateApiImports', 'apiImports')
  })
})
```

2. `matchInlineTransformSnapshot`—very similar to above, but use this in case you want to just provide your fixtures inline

```js
it('Modifies imports (inline)', async () => {
  await matchInlineTransformSnapshot(
    'updateGraphQLFunction', // <--- transform name, so we know which transform to apply
    `import {
        createGraphQLHandler,   // <-- input source
        makeMergedSchema,
      } from '@redwoodjs/api'`,
    `import { createGraphQLHandler } from '@redwoodjs/graphql-server'`, // <-- expected output
  )
})
```

3. `matchFolderTransform` - use this, when you're modifying contents of multiple files, and adding/deleting files from the user's project during the codemod.

```js
test('Removes babel config for default setup', async () => {
  import transform from '../updateBabelConfig'

  // pass in your transform here 👇
  await matchFolderTransform(transform, 'my-default-fixture')
  // and tell it which folder to use as fixture here ☝️
})
```

In the above example, it will run the transform from `updateBabelConfig` against a fixture located in the `__testfixtures__/my-default-fixture/input` folder and compare with the `__testfixtures__/my-default-fixture/output` folder.

The `matchFolderTransform` helper will check
a) If the files in the output fixture folder are present after transform
b) If their contents match

## How to run your changes on a test redwood project

1. Clean all your other packages, and rebuild once:

```shell
# root of framework
yarn build:clean
yarn build
```

2. Build the codemods package

```shell
cd packages/codemods
yarn build
```

3. Running the updated CLI

The CLI is meant to be run on a redwood project (i.e. it expects you to be cd'd into a redwood project), but you can provide it as an environment variable too!

```shell
RWJS_CWD=/path/to/rw-project node "./packages/codemods/dist/codemods.js" {your-codemod-name}
# ☝️ this is the path to your rw project (not the framework!)
```

> **💡 Tip**
>
> If you're making changes, and want to watch your source and build on changes, you can use the [watch cli](https://www.npmjs.com/package/watch-cli)
>
> ```shell
> # Assuming in packages/codemods/
> watch -p "./src/**/*" -c "yarn build"
> ```

4. Debugging

If you have a node and want to see/confirm what you're working with you can
pass it to jscodeshift and then call `.toSource()` on it.

**Example**

```js
const j = api.jscodeshift
const root = j(file.source)

const graphQLClientConfig = j.jsxAttribute(
  j.jsxIdentifier('graphQLClientConfig'),
  j.jsxExpressionContainer(j.objectExpression([])),
)

console.log('graphQLClientConfig prop', j(graphQLClientConfig).toSource())
// Will log:
// graphQLClientConfig={{}}
```

If you have a collection of nodes you first need to get just one of the
collection items, and then get the node out of that.

**Example**

```js
const j = api.jscodeshift
const root = j(file.source)

const redwoodApolloProvider = root.findJSXElements('RedwoodApolloProvider')

console.log(
  '<RedwoodApolloProvider>',
  j(redwoodApolloProvider.get(0).node).toSource(),
)
// Will log:
// <RedwoodApolloProvider useAuth={useAuth}>
//   <Routes />
// </RedwoodApolloProvider>
```
