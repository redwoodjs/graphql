**IMPORTANT:** This is an **internal** and **development-time only** package :exclamation:

# Overview

- The @redwoodjs/structure package lets you build, validate and inspect an object graph that represents a complete Redwood project
- It is used by the CLI and by VSCode extensions to provide IDE features such as diagnostics, code-fixes, etc.
- **IMPORTANT:** This is an **internal** and **development-time only** package
  - You **cannot** "import it" into a normal redwood app

## Code

- `/model/*`: The main API and classes (such as RWProject, RWPage, RWService, etc)
- `/language_server/*`: A [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) implementation that wraps the `model` classes. More info [here](./src/language_server/README.md)
- We use [vscode-languageserver-types](https://www.npmjs.com/package/vscode-languageserver-types) where possible (to represent Document URIs, Positions, Ranges, Diagnostics, etc)

# Usage

## Diagnostics

The most common use-case is getting the diagnostics of a complete Redwood project:

```ts
import { getProject } from '@redwoodjs/structure'
async function test() {
  const project = getProject('/path/to/app') // or "file:///path/to/app"
  for (const d of await project.collectDiagnostics()) {
    console.log(d.diagnostic.severity + ': ' + d.diagnostic.message)
  }
}
// ...
// error: Router must have only one "notfound" page
// error: Duplicate path in router: '/about-us'
// error: Parameter "id" in route '/product/{id}' does not exist on ProductPage
// error: PostsCell is missing the "Success" exported const
// error: Property "email" does not exist on "User" model
// warning: Unused page AboutUs.js
```

Note: Gathering _all_ diagnostics is expensive. It will trigger the creation of the complete project graph.

## Exploration

You can also traverse the graph to get more detailed information on multiple aspects of your app.

For example, iterating over the routes of a Redwood project:

```ts
import { getProject } from '@redwoodjs/structure'
async function test() {
  const project = getProject('/path/to/app')
  for (const route of project.router.routes) {
    console.log(route.path + (route.isPrivate ? ' (private)' : ''))
  }
}
// /
// /about
// /product/{id}
// /admin (private)
```

# Design Notes

- The project is represented by an AST of sorts (via the RWProject, RWRoute, etc classes)
- While it can be explored as a graph, it is effectively a **tree** (via the children/parent properties) with stable IDs for each node
- Nodes are created lazily as the user traverses properties.
- There is extensive caching going on under the hood. **If the underlying project changes, you need to create a new project**

## ids

- Each node in the graph has an `id` property.
- ids are unique and stable
- They are organized in a hierarchical fashion (so that `child.id.startsWith(parent.id) === true`)
- Requesting a node using its id will not require the complete project to be processed. Only the subset that is needed (usually only the node's ancestors). This is important to enable efficient IDE-like tooling to interact with the project graph and get diagnostics for quickly changing files.

```ts
import { getProject } from '@redwoodjs/structure'
async function test() {
  const project = getProject('/path/to/app')
  const router = await project.findNode('file:///path/to/app/web/src/Routes.js')
  console.log(router.routes.length)
}
```

Here are some examples of ids:

- (Project)
  - id: `"file:///project/root"`
    - router: (Router)
      - id: `"file:///project/root/web/src/Routes.js"`
      - routes[0]: (Route)
        - id: `"file:///project/root/web/src/Routes.js /home"` (notice that this id has two elements - it is an "internal" node)

An id is "usually" a file or folder.

Anatomy of an id:

- An id is a string.
- It has components separated by spaces.
- The first component is always a file URI (or folder URI).
- The rest are optional, and only exist when the node is internal to a file.

## Abstracting File System Access

To allow use cases like dealing with unsaved files in IDEs, some filesystem methods can be overridden via the Host interface.

```ts
import { Host, getProject } from '@redwoodjs/structure'
const myHost: Host {
  readFileSync(path:string){
    // ...
  }
  // ...
}
const project = getProject('/path/to/project', myHost)
```

## Sync VS Async

When possible, the project graph is constructed synchronously. There are only a few exceptions. This simplifies the domain logic and validations, which is the main driver behind the project model itself.

## Parsing Invalid Projects

- It is possible to obtain a graph for an invalid/malformed Redwood project. This is by design since one of the main goals of this package is to provide a foundation for IDEs, which must support projects in invalid states
- If you want to check for structural validity, gather all diagnostics and look for errors.

```ts
import { getProject, DiagnosticSeverity } from '@redwoodjs/structure'
async function test() {
  try {
    const project = getProject('/path/to/app')
    const diagnostics = await project.collectDiagnostics()
    const hasErrors = diagnostics.some(
      (d) => d.diagnostic.severity === DiagnosticSeverity.Error,
    )
  } catch (e) {
    // we caught a runtime error
    // in some cases this is the desired behavior
    // but in MOST cases we SHOULD turn this into a diagnostic error
    // please file an issue if you believe this should be the case
    throw e
  }
}
```

NOTE: It is possible (and very likely at this point) that this package will sometimes fail with a runtime error (for example, it will try to read a file that doesn't exist).
