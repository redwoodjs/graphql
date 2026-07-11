# Contributing

In general, modifying code in the structure package is no different from the rest of Redwood and the instructions described in [redwood/CONTRIBUTING.md](../../CONTRIBUTING.md) apply verbatim. Make sure you've read that document first.

# Editing the Outline, Diagnostics, and other VSCode Features Locally

Some of the code in this package can only be experienced through the [Redwood IDE VSCode extension](https://marketplace.visualstudio.com/items?itemName=decoupled.redwoodjs-ide) (like the Outline, CodeLens, and some Diagnostics).
If you plan to modify code that falls in this category (for example [outline.ts](https://github.com/redwoodjs/redwood/blob/main/packages/structure/src/language_server/outline.ts)) then you'll need to follow this workflow so you can test your changes locally:

## Workflow

- Install the [Redwood IDE](https://marketplace.visualstudio.com/items?itemName=decoupled.redwoodjs-ide) VSCode Extension
- Follow the instructions in [redwood/CONTRIBUTING.md](../../CONTRIBUTING.md)
- If you followed the instructions above and you're using VSCode, you'll eventually have two VSCode windows open:
  - Window A: to edit the Redwood Framework itself (the code you checked out from `github.com/redwoodjs/redwood`)
  - Window B: to edit a Redwood App that uses your edited version of the framework (which is kept in sync via `rwt copy:watch`, for example)
- Now here's the important part: Whenever you make a change to a feature that surfaces through the VSCode extension, **you need to "reload" Window B** to see the changes. (`Ctrl+Shift+P` > `Reload Window`)

## Under the hood: VSCode + Structure

It can be useful to understand what's going on under the hood:

There are three main elements involved:

- VSCode
- The Redwood IDE Extension
  - The code for this extension is not in this repo (yet)
- The Redwood Language Server
  - This is what you'll actually change when you modify code in `redwood/structure`

And here's what happens every time the IDE starts:

- VSCode starts
- It reads extension metadata for all extensions (their package.json) and finds that the Redwood IDE extension declares a "Redwood Outline" view, for example. At this point VSCode "might" draw an empty view. It still hasn't executed any extension code
- It starts the Extension Host, which is a separate process that will initialize extensions one by one
- The extension host activates the Redwood IDE extension
- The extension runs a pre-activation step that installs dependencies (yarn...). This can take a moment (you'll see a status bar message with a spinner (ex: "redwoodjs-ide 0.0.9 installing dependencies..."). It also creates an output channel `decoupled.redwoodjs-ide-x.x.x (preactivator)`
- At this point the "Redwood Outline" view should still be empty
- Once dependencies are ready, the extension starts executing code
- It creates an output channel called `decoupled.redwoodjs-ide-x.x.x`
- It will look for a `redwood.toml` in the workspace
- If it finds one, then it needs to start the Redwood Language Server in the backend (the one that actually parses the project, detects errors, etc)
- The Language Server is bundled with Redwood itself (to prevent version mismatch issues), so the extension looks for a file in node_modules: `node_modules/@redwoodjs/structure/dist/language_server/start.js`
- If this file is found, the Redwood IDE extension tries to start it as a Language Server
- However, the actual Language Server might not start until a file is open in the editor (this is managed by VSCode)
- When started, the Language Server creates an output channel called `Redwood Language Server`
- The Language Server starts processing the project. This can take seconds to a minute
- Once the first pass is ready, it will start talking back to the extension
- AT THIS POINT, THE OUTLINE APPEARS FOR THE FIRST TIME
- The Language Server is called at an interval to update diagnostics, the outline, etc. At any given point, the Language Server might also crash (because your project might be invalid, to a point where a basic assumption fails). If this happens, the extension will try to restart it at an interval
