# Overview

This folder contains a [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) implementation that wraps the `../model` classes.

# Usage

The `start.ts` file is the entry point for the language server.

Note: When Redwood is installed in node_modules, this file will be present somewhere (as `start.js`).

# Protocol Extensions/Compatibility

- This server exposes some additional methods that are not part of the protocol (for example, a set of methods called `redwoodjs/x-outline-*`). Since they are extra methods, they shouldn't break compatibility.
- However, **there is a breaking change**: The language server expects the host to implement some extra capabilities for user interaction (like prompting for input). These are only used by the "interactive CLI" functionality. If you are trying to use this language server in your own extension, you'll most likely run into some issues here. For now, only Decoupled Studio implements these extra capabilities.
