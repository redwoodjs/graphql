---
slug: create-redwood-app
description: Instructions and usage examples for Create Redwood App
---

# Create Redwood App

To get up and running with Redwood, you can use Create Redwood App:

```terminal
yarn create redwood-app <your-app-name>
```

## Set up for success

Redwood requires that you're running Node version 20 or higher.

If you're running Node version 21.0.0 or higher, you can still use Create Redwood App, but it may make your project incompatible with some deploy targets, such as AWS Lambdas.

To see what version of Node you're running, you can run the following command in your terminal:

```terminal
node -v
```

If you need to update your version of Node or run multiple versions of Node, we recommend installing nvm and have [documentation about how to get up and running.](./how-to/using-nvm)

You also need to have yarn version 1.22.21 or higher installed. To see what version of yarn you're running, you can run the following command in your terminal:

```terminal
yarn -v
```

To upgrade your version of yarn, [you can refer to the yarn documentation](https://yarnpkg.com/getting-started/install).

## What you can expect

### Select your preferred language

Options: TypeScript (default) or JavaScript

If you choose JavaScript, you can always [add TypeScript later](/docs/typescript/introduction#converting-a-javascript-project-to-typescript).

### Do you want to initialize a git repo?

Options: yes (default) or no

If you mark "yes", then it will ask you to **Enter a commit message**. The default message is "Initial commit."

You can always initialize a git repo later and add a commit message by running the following commands in your terminal:

```terminal
cd <your-app-name>
git init
git add .
git commit -m "Initial commit"
```

If you're new to git, here's a recommended playlist on YouTube: [git for Beginners](https://www.youtube.com/playlist?list=PLrz61zkUHJJFmfTgOVL1mBw_NZcgGe882)

### Do you want to run `yarn install`?

Options: yes (default) or no

_NOTE: This prompt will only display if you're running yarn, version 1._

This command will download all of your project's dependencies.

If you mark "no", you can always run this command later:

```terminal
cd <your-app-name>
yarn install
```

## Running the development server

Once the Create Redwood app has finished running, you can start your development server by running the following command:

```terminal
cd <your-app-name>
yarn rw dev
```

- This will start your development server at `http://localhost:8910`.
- Your API will be available at `http://localhost:8911`.
- You can visit the Redwood GraphQL Playground at `http://localhost:8911/graphql`.

## Flags

You can by pass these prompts by using the following flags:

| Flag                                | Alias | What it does                                                                        |
| :---------------------------------- | :---- | :---------------------------------------------------------------------------------- |
| `--yarn-install`                    |       | Run `yarn install`                                                                  |
| `--typescript`                      | `ts`  | Set TypeScript as the preferred language (pass `--no-typescript` to use JavaScript) |
| `--overwrite`                       |       | Overwrites the existing directory, if it has the same name                          |
| `--git-init`                        | `git` | Initializes a git repository                                                        |
| `--commit-message "Initial commit"` | `m`   | Specifies the initial git commit message                                            |
| `--yes`                             | `y`   | Automatically select all defaults                                                   |

For example, here's the project with all flags enabled:

```terminal
yarn create redwood-app <your-app-name> --typescript --git-init --commit-message "Initial commit" --yarn-install
```
