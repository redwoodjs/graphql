---
description: A comprehensive reference of Redwood's CLI
---

# Command Line Interface

The following is a comprehensive reference of the Redwood CLI. You can get a glimpse of all the commands by scrolling the aside to the right.

The Redwood CLI has two entry-point commands:

1. **redwood** (alias `rw`), which is for developing an application, and
2. **redwood-tools** (alias `rwt`), which is for contributing to the framework.

This document covers the `redwood` command . For `redwood-tools`, see [Contributing](https://github.com/redwoodjs/redwood/blob/main/CONTRIBUTING.md#cli-reference-redwood-tools) in the Redwood repo.

**A Quick Note on Syntax**

We use [yargs](http://yargs.js.org/) and borrow its syntax here:

```
yarn redwood generate page <name> [path] --option
```

- `redwood generate page` is the command.
- `<name>` and `[path]` are positional arguments.
  - `<>` denotes a required argument.
  - `[]` denotes an optional argument.
- `--option` is an option.

Every argument and option has a type. Here `<name>` and `[path]` are strings and `--option` is a boolean.

You'll also sometimes see arguments with trailing `..` like:

```
yarn redwood build [side..]
```

The `..` operator indicates that the argument accepts an array of values. See [Variadic Positional Arguments](https://github.com/yargs/yargs/blob/master/docs/advanced.md#variadic-positional-arguments).

## create redwood-app

Create a Redwood project using the yarn create command:

```
yarn create redwood-app <project directory> [option]
```

| Arguments & Options    | Description                                                                                                                                               |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project directory`    | Specify the project directory [Required]                                                                                                                  |
| `--yarn-install`       | Enables the yarn install step and version-requirement checks. You can pass `--no-yarn-install` to disable this behavior                                   |
| `--typescript`, `--ts` | Generate a TypeScript project. JavaScript by default                                                                                                      |
| `--overwrite`          | Create the project even if the specified project directory isn't empty                                                                                    |
| `--no-telemetry`       | Disable sending telemetry events for this create command and all Redwood CLI commands: [https://telemetry.redwoodjs.com](https://telemetry.redwoodjs.com) |
| `--yarn1`              | Use yarn 1 instead of yarn 3                                                                                                                              |
| `--git-init`, `--git`  | Initialize a git repo during the install process, disabled by default                                                                                     |

If you run into trouble during the yarn install step, which may happen if you're developing on an external drive and in other miscellaneous scenarios, try the `--yarn1` flag:

```
yarn create redwood-app my-redwood-project --yarn1
```

## build

Build for production.

```bash
yarn redwood build [side..]
```

We use Babel to transpile the api side into `./api/dist` and Vite to package the web side into `./web/dist`.

| Arguments & Options | Description                                                                      |
| :------------------ | :------------------------------------------------------------------------------- |
| `side`              | Which side(s) to build. Choices are `api` and `web`. Defaults to `api` and `web` |
| `--verbose, -v`     | Print more information while building                                            |

#### Usage

See [Builds](builds.md).

#### Example

Running `yarn redwood build` without any arguments generates the Prisma client and builds both sides of your project:

```bash
~/redwood-app$ yarn redwood build
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood build
✔ Generating the Prisma client...
✔ Building "api"...
✔ Building "web"...
Done in 17.37s.
```

Files are output to each side's `dist` directory:

```plaintext {2,6}
├── api
│   ├── dist
│   ├── prisma
│   └── src
└── web
    ├── dist
    ├── public
    └── src
```

## check (alias diagnostics)

Get structural diagnostics for a Redwood project (experimental).

```
yarn redwood check
```

#### Example

```bash
~/redwood-app$ yarn redwood check
yarn run v1.22.4
web/src/Routes.js:14:5: error: You must specify a 'notfound' page
web/src/Routes.js:14:19: error: Duplicate Path
web/src/Routes.js:15:19: error: Duplicate Path
web/src/Routes.js:17:40: error: Page component not found
web/src/Routes.js:17:19: error (INVALID_ROUTE_PATH_SYNTAX): Error: Route path contains duplicate parameter: "/{id}/{id}"
```

## console (alias c)

Launch an interactive Redwood shell (experimental):

- This has not yet been tested on Windows.
- The Prisma Client must be generated _prior_ to running this command, e.g. `yarn redwood prisma generate`. This is a known issue.

```
yarn redwood console
```

Right now, you can only use the Redwood console to interact with your database (always with `await`):

#### Example

```bash
~/redwood-app$ yarn redwood console
yarn run v1.22.4
> await db.user.findMany()
> [ { id: 1, email: 'tom@redwoodjs.com', name: 'Tom'  } ]
```

## data-migrate

Data migration tools.

```bash
yarn redwood data-migrate <command>
```

| Command   | Description                                                                                 |
| :-------- | :------------------------------------------------------------------------------------------ |
| `install` | Appends `DataMigration` model to `schema.prisma`, creates `api/db/dataMigrations` directory |
| `up`      | Executes outstanding data migrations                                                        |

### data-migrate install

- Appends a `DataMigration` model to `schema.prisma` for tracking which data migrations have already run.
- Creates a DB migration using `yarn redwood prisma migrate dev --create-only create_data_migrations`.
- Creates `api/db/dataMigrations` directory to contain data migration scripts

```bash
yarn redwood data-migrate install
```

### data-migrate up

Executes outstanding data migrations against the database. Compares the list of files in `api/db/dataMigrations` to the records in the `DataMigration` table in the database and executes any files not present.

If an error occurs during script execution, any remaining scripts are skipped and console output will let you know the error and how many subsequent scripts were skipped.

```bash
yarn redwood data-migrate up
```

## dev

Start development servers for api and web.

```bash
yarn redwood dev [side..]
```

`yarn redwood dev api` starts the Redwood dev server and `yarn redwood dev web` starts the Vite dev server with Redwood's config.

| Argument           | Description                                                                            |
| :----------------- | :------------------------------------------------------------------------------------- |
| `side`             | Which dev server(s) to start. Choices are `api` and `web`. Defaults to `api` and `web` |
| `--forward, --fwd` | String of one or more Vite Dev Server config options. See example usage below          |

#### Usage

If you're only working on your sdl and services, you can run just the api server to get GraphQL Playground on port 8911:

```bash
~/redwood-app$ yarn redwood dev api
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood dev api
$ /redwood-app/node_modules/.bin/dev-server
15:04:51 api | Listening on http://localhost:8911
15:04:51 api | Watching /home/dominic/projects/redwood/redwood-app/api
15:04:51 api \
  | 15:04:51 api | Now serving
15:04:51 api \
  | 15:04:51 api | ► http://localhost:8911/graphql/
```

Using `--forward` (alias `--fwd`), you can pass one or more Vite Dev Server [config options](https://vitejs.dev/guide/cli#vite). The following will run the dev server, set the port to `1234`, and disable automatic browser opening.

```bash
~/redwood-app$ yarn redwood dev --fwd="--port=1234 --open=false"
```

You may need to access your dev application from a different host, like your mobile device or an SSH tunnel. To resolve the “Invalid Host Header” message, run the following:

```bash
~/redwood-app$ yarn redwood dev --fwd="--allowed-hosts all"
```

For the full list of Vite Dev Server settings, see [this documentation](https://vitejs.dev/guide/cli#vite).

For the full list of Server Configuration settings, see [this documentation](app-configuration-redwood-toml.md#api).

## deploy

Deploy your redwood project to a hosting provider target.

**Netlify, Vercel, and Render**

For hosting providers that auto deploy from Git, the deploy command runs the set of steps to build, apply production DB changes, and apply data migrations. In this context, it is often referred to as a Build Command. _Note: for Render, which uses traditional infrastructure, the command also starts Redwood's api server._

**AWS**

This command runs the steps to both build your project _and_ deploy it to AWS.

```
yarn redwood deploy <target>
```

| Commands                      | Description                              |
| :---------------------------- | :--------------------------------------- |
| `serverless`                  | Deploy to AWS using Serverless framework |
| `netlify [...commands]`       | Build command for Netlify deploy         |
| `render <side> [...commands]` | Build command for Render deploy          |
| `vercel [...commands]`        | Build command for Vercel deploy          |

### deploy serverless

Deploy to AWS CloudFront and Lambda using [Serverless](https://www.serverless.com/) framework

```
yarn redwood deploy serverless
```

| Options & Arguments | Description                                                                                                                                 |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------ |
| `--side`            | which Side(s)to deploy [choices: "api", "web"] [default: "web","api"]                                                                       |
| `--stage`           | serverless stage, see [serverless stage docs](https://www.serverless.com/blog/stages-and-environments) [default: "production"]              |
| `--pack-only`       | Only package the build for deployment                                                                                                       |
| `--first-run`       | Use this flag the first time you deploy. The first deploy wizard will walk you through configuring your web side to connect to the api side |

### deploy netlify

Build command for Netlify deploy

```
yarn redwood deploy netlify
```

| Options                | Description                                         |
| :--------------------- | :-------------------------------------------------- |
| `--build`              | Build for production [default: "true"]              |
| `--prisma`             | Apply database migrations [default: "true"]         |
| `--data-migrate, --dm` | Migrate the data in your database [default: "true"] |

#### Example

The following command will build, apply Prisma DB migrations, and skip data migrations.

```
yarn redwood deploy netlify --no-data-migrate
```

:::warning
While you may be tempted to use the [Netlify CLI](https://cli.netlify.com) commands to [build](https://cli.netlify.com/commands/build) and [deploy](https://cli.netlify.com/commands/deploy) your project directly from you local project directory, doing so **will lead to errors when deploying and/or when running functions**. I.e. errors in the function needed for the GraphQL server, but also other serverless functions.

The main reason for this is that these Netlify CLI commands simply build and deploy -- they build your project locally and then push the dist folder. That means that when building a RedwoodJS project, the [Prisma client is generated with binaries matching the operating system at build time](https://cli.netlify.com/commands/link) -- and not the [OS compatible](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#binarytargets-options) with running functions on Netlify. Your Prisma client engine may be `darwin` for OSX or `windows` for Windows, but it needs to be `debian-openssl-1.1.x` or `rhel-openssl-1.1.x`. If the client is incompatible, your functions will fail.

Therefore, please follow the [instructions in the Tutorial](tutorial/chapter4/deployment.md#netlify) to sync your GitHub (or other compatible source control service) repository with Netlify and allow their build and deploy system to manage deployments.

The [Netlify CLI](https://cli.netlify.com) still works well for [linking your project to your site](https://cli.netlify.com/commands/link), testing local builds and also using their [dev](https://cli.netlify.com/commands/dev) or [dev --live](https://cli.netlify.com/commands/dev) to share your local dev server via a tunnel.
:::

### deploy render

Build (web) and Start (api) command for Render deploy. (For usage instructions, see the Render [Deploy Redwood](https://render.com/docs/deploy-redwood) doc.)

```
yarn redwood deploy render <side>
```

| Options & Arguments    | Description                                         |
| :--------------------- | :-------------------------------------------------- |
| `side`                 | select side to build [choices: "api", "web"]        |
| `--prisma`             | Apply database migrations [default: "true"]         |
| `--data-migrate, --dm` | Migrate the data in your database [default: "true"] |
| `--serve`              | Run server for api in production [default: "true"]  |

#### Example

The following command will build the Web side for static-site CDN deployment.

```
yarn redwood deploy render web
```

The following command will apply Prisma DB migrations, run data migrations, and start the api server.

```
yarn redwood deploy render api
```

### deploy vercel

Build command for Vercel deploy

```
yarn redwood deploy vercel
```

| Options                | Description                                         |
| :--------------------- | :-------------------------------------------------- |
| `--build`              | Build for production [default: "true"]              |
| `--prisma`             | Apply database migrations [default: "true"]         |
| `--data-migrate, --dm` | Migrate the data in your database [default: "true"] |

#### Example

The following command will build, apply Prisma DB migrations, and skip data migrations.

```
yarn redwood deploy vercel --no-data-migrate
```

## destroy (alias d)

Rollback changes made by the generate command.

```
yarn redwood destroy <type>
```

| Command              | Description                                                                     |
| :------------------- | :------------------------------------------------------------------------------ |
| `cell <name>`        | Destroy a cell component                                                        |
| `component <name>`   | Destroy a component                                                             |
| `function <name>`    | Destroy a Function                                                              |
| `layout <name>`      | Destroy a layout component                                                      |
| `page <name> [path]` | Destroy a page and route component                                              |
| `scaffold <model>`   | Destroy pages, SDL, and Services files based on a given DB schema Model         |
| `sdl <model>`        | Destroy a GraphQL schema and service component based on a given DB schema Model |
| `service <name>`     | Destroy a service component                                                     |
| `directive <name>`   | Destroy a directive                                                             |

## exec

Execute scripts generated by [`yarn redwood generate script <name>`](#generate-script) to run one-off operations, long-running jobs, or utility scripts.

#### Usage

You can pass any flags to the command and use them within your script:

```
❯ yarn redwood exec syncStripeProducts foo --firstParam 'hello' --two 'world'

[18:13:56] Generating Prisma client [started]
[18:13:57] Generating Prisma client [completed]
[18:13:57] Running script [started]
:: Executing script with args ::
{ _: [ 'exec', 'foo' ], firstParam: 'hello', two: 'world', '$0': 'rw' }
[18:13:58] Running script [completed]
✨  Done in 4.37s.
```

**Examples of CLI scripts:**

- One-off scripts—such as syncing your Stripe products to your database
- A background worker you can off-load long running tasks
- Custom seed scripts for your application during development

See [this how to](how-to/background-worker.md) for an example of using exec to run a background worker.

## experimental (alias exp)

Set up and run experimental features.

Some caveats:

- these features do not follow SemVer (may be breaking changes in minor and patch releases)
- these features may be deprecated or removed (anytime)
- your feedback is wanted and necessary!

For more information, including details about specific features, see this Redwood Forum category:
[Experimental Features](https://community.redwoodjs.com/c/experimental-features/25)

**Available Experimental Features**
View all that can be _set up_:

```
yarn redwood experimental --help
```

## generate (alias g)

Save time by generating boilerplate code.

```
yarn redwood generate <type>
```

Some generators require that their argument be a model in your `schema.prisma`. When they do, their argument is named `<model>`.

| Command                | Description                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `cell <name>`          | Generate a cell component                                                                             |
| `component <name>`     | Generate a component component                                                                        |
| `dataMigration <name>` | Generate a data migration component                                                                   |
| `dbAuth`               | Generate sign in, sign up and password reset pages for dbAuth                                         |
| `deploy <provider>`    | Generate a deployment configuration                                                                   |
| `function <name>`      | Generate a Function                                                                                   |
| `job <name>`           | Generate a background job                                                                             |
| `layout <name>`        | Generate a layout component                                                                           |
| `page <name> [path]`   | Generate a page component                                                                             |
| `scaffold <model>`     | Generate Pages, SDL, and Services files based on a given DB schema Model. Also accepts `<path/model>` |
| `sdl <model>`          | Generate a GraphQL schema and service object                                                          |
| `secret`               | Generate a secret key using a cryptographically-secure source of entropy                              |
| `service <name>`       | Generate a service component                                                                          |
| `types`                | Generate types and supplementary code                                                                 |
| `script <name>`        | Generate a script that can use your services/libs to execute with `redwood exec script <name>`        |

### TypeScript generators

If your project is configured for TypeScript (see the [TypeScript docs](typescript/index)), the generators will automatically detect and generate `.ts`/`.tsx` files for you

**Undoing a Generator with a Destroyer**

Most generate commands (i.e., everything but `yarn redwood generate dataMigration`) can be undone by their corresponding destroy command. For example, `yarn redwood generate cell` can be undone with `yarn redwood destroy cell`.

### generate cell

Generate a cell component.

```bash
yarn redwood generate cell <name>
```

Cells are signature to Redwood. We think they provide a simpler and more declarative approach to data fetching.

| Arguments & Options  | Description                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`               | Name of the cell                                                                                                                                                 |
| `--force, -f`        | Overwrite existing files                                                                                                                                         |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript                                                                             |
| `--query`            | Use this flag to specify a specific name for the GraphQL query. The query name must be unique                                                                    |
| `--list`             | Use this flag to generate a list cell. This flag is needed when dealing with irregular words whose plural and singular is identical such as equipment or pokemon |
| `--tests`            | Generate test files [default: true]                                                                                                                              |
| `--stories`          | Generate Storybook files [default: true]                                                                                                                         |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                                                                                              |

#### Usage

The cell generator supports both single items and lists. See the [Single Item Cell vs List Cell](cells.md#single-item-cell-vs-list-cell) section of the Cell documentation.

See the [Cells](tutorial/chapter2/cells.md) section of the Tutorial for usage examples.

**Destroying**

```
yarn redwood destroy cell <name>
```

#### Example

Generating a user cell:

```bash
~/redwood-app$ yarn redwood generate cell user
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g cell user
✔ Generating cell files...
✔ Writing $(./web/src/components/UserCell/UserCell.test.js)...
✔ Writing $(./web/src/components/UserCell/UserCell.js)...
Done in 1.00s.
```

A cell defines and exports four constants: `QUERY`, `Loading`, `Empty`, `Failure`, and `Success`:

```jsx title="./web/src/components/UserCell/UserCell.js"
export const QUERY = gql`
  query {
    user {
      id
    }
  }
`

export const Loading = () => <div>Loading...</div>

export const Empty = () => <div>Empty</div>

export const Failure = ({ error }) => <div>Error: {error.message}</div>

export const Success = ({ user }) => {
  return JSON.stringify(user)
}
```

### generate component

Generate a component.

```bash
yarn redwood generate component <name>
```

Redwood loves function components and makes extensive use of React Hooks, which are only enabled in function components.

| Arguments & Options  | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `name`               | Name of the component                                                                |
| `--force, -f`        | Overwrite existing files                                                             |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript |
| `--tests`            | Generate test files [default: true]                                                  |
| `--stories`          | Generate Storybook files [default: true]                                             |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                  |

**Destroying**

```
yarn redwood destroy component <name>
```

#### Example

Generating a user component:

```bash
~/redwood-app$ yarn redwood generate component user
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g component user
✔ Generating component files...
✔ Writing $(./web/src/components/User/User.test.js)...
✔ Writing $(./web/src/components/User/User.js)...
Done in 1.02s.
```

The component will export some jsx telling you where to find it.

```jsx title="./web/src/components/User/User.js"
const User = () => {
  return (
    <div>
      <h2>{'User'}</h2>
      <p>{'Find me in ./web/src/components/User/User.js'}</p>
    </div>
  )
}

export default User
```

### generate dataMigration

Generate a data migration script.

```
yarn redwood generate dataMigration <name>
```

Creates a data migration script in `api/db/dataMigrations`.

| Arguments & Options | Description                                                              |
| :------------------ | :----------------------------------------------------------------------- |
| `name`              | Name of the data migration, prefixed with a timestamp at generation time |
| `--rollback`        | Rollback changes if an error occurs [default: true]                      |

#### Usage

See the [Data Migration](data-migrations.md) docs.

#### Usage

See the [Deploy](/docs/deploy/introduction) docs.

### generate dbAuth

Generate log in, sign up, forgot password and password reset pages for dbAuth

```
yarn redwood generate dbAuth
```

| Arguments & Options | Description                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `--username-label`  | The label to give the username field on the auth forms, e.g. "Email". Defaults to "Username". If not specified you will be prompted  |
| `--password-label`  | The label to give the password field on the auth forms, e.g. "Secret". Defaults to "Password". If not specified you will be prompted |
| `--webAuthn`        | Whether or not to add webAuthn support to the log in page. If not specified you will be prompted                                     |
| `--rollback`        | Rollback changes if an error occurs [default: true]                                                                                  |

If you don't want to create your own log in, sign up, forgot password and
password reset pages from scratch you can use this generator. The pages will be
available at /login, /signup, /forgot-password, and /reset-password. Check the
post-install instructions for one change you need to make to those pages: where
to redirect the user to once their log in/sign up is successful.

If you'd rather create your own, you might want to start from the generated
pages anyway as they'll contain the other code you need to actually submit the
log in credentials or sign up fields to the server for processing.

:::important
This `generate dbAuth` command simply adds the pages. You must add the necessary dbAuth functions and
app setup by running `yarn rw setup auth dbAuth` to fully use dbAuth.
:::

### generate directive

Generate a directive.

```bash
yarn redwood generate directive <name>
```

| Arguments & Options  | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `name`               | Name of the directive                                                 |
| `--force, -f`        | Overwrite existing files                                              |
| `--typescript, --ts` | Generate TypeScript files (defaults to your projects language target) |
| `--type`             | Directive type [Choices: "validator", "transformer"]                  |
| `--rollback`         | Rollback changes if an error occurs [default: true]                   |

#### Usage

See [Redwood Directives](directives.md).

**Destroying**

```
yarn redwood destroy directive <name>
```

#### Example

Generating a `myDirective` directive using the interactive command:

```bash
yarn rw g directive myDirective

? What type of directive would you like to generate? › - Use arrow-keys. Return to submit.
❯ Validator - Implement a validation: throw an error if criteria not met to stop execution
Transformer - Modify values of fields or query responses
```

### generate function

Generate a Function.

```
yarn redwood generate function <name>
```

Not to be confused with Javascript functions, Capital-F Functions are meant to be deployed to serverless endpoints like AWS Lambda.

| Arguments & Options  | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `name`               | Name of the function                                                                 |
| `--force, -f`        | Overwrite existing files                                                             |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                  |

#### Usage

See the [Custom Function](how-to/custom-function.md) how to.

**Destroying**

```
yarn redwood destroy function <name>
```

#### Example

Generating a user function:

```bash
~/redwood-app$ yarn redwood generate function user
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g function user
✔ Generating function files...
✔ Writing $(./api/src/functions/user.js)...
Done in 16.04s.
```

Functions get passed `context` which provides access to things like the current user:

```jsx title="./api/src/functions/user.js"
export const handler = async (event, context) => {
  return {
    statusCode: 200,
    body: `user function`,
  }
}
```

Now if we run `yarn redwood dev api`:

```plaintext {11}
~/redwood-app$ yarn redwood dev api
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood dev api
$ /redwood-app/node_modules/.bin/dev-server
17:21:49 api | Listening on http://localhost:8911
17:21:49 api | Watching /home/dominic/projects/redwood/redwood-app/api
17:21:49 api |
17:21:49 api | Now serving
17:21:49 api |
17:21:49 api | ► http://localhost:8911/graphql/
17:21:49 api | ► http://localhost:8911/user/
```

### generate job

Generate a background job file (and optional tests) in `api/src/jobs`.

```bash
yarn redwood generate job <name>
```

| Arguments & Options  | Description                                                                           |
| -------------------- | ------------------------------------------------------------------------------------- |
| `name`               | Name of the job ("Job" suffix is optional)                                            |
| `--force, -f`        | Overwrite existing files                                                              |
| `--typescript, --ts` | Generate TypeScript files. Enabled by default if we detect your project is TypeScript |
| `--tests`            | Generate test files [default: true]                                                   |

#### Example

```bash
yarn redwood generate job WelcomeEmail
# or
yarn rw g job WelcomeEmail
```

:::info Job naming
By convention a job filename and exported code ends in `Job` and the generate command enforces this. If you don't include "Job" at the end of the name, the generator will add it. For example, with the above command, the file generated would be `api/src/jobs/WelcomeEmailJob/WelcomeEmailJob.{js|ts}`.
:::

Learn more about jobs in the [Background Jobs docs](background-jobs).

### generate layout

Generate a layout component.

```bash
yarn redwood generate layout <name>
```

Layouts wrap pages and help you stay DRY.

| Arguments & Options  | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `name`               | Name of the layout                                                                   |
| `--force, -f`        | Overwrite existing files                                                             |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript |
| `--tests`            | Generate test files [default: true]                                                  |
| `--stories`          | Generate Storybook files [default: true]                                             |
| `--skipLink`         | Generate a layout with a skip link [default: false]                                  |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                  |

#### Usage

See the [Layouts](tutorial/chapter1/layouts.md) section of the tutorial.

**Destroying**

```
yarn redwood destroy layout <name>
```

#### Example

Generating a user layout:

```bash
~/redwood-app$ yarn redwood generate layout user
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g layout user
✔ Generating layout files...
✔ Writing $(./web/src/layouts/UserLayout/UserLayout.test.js)...
✔ Writing $(./web/src/layouts/UserLayout/UserLayout.js)...
Done in 1.00s.
```

A layout will just export its children:

```jsx title="./web/src/layouts/UserLayout/UserLayout.test.js"
const UserLayout = ({ children }) => {
  return <>{children}</>
}

export default UserLayout
```

### generate model

Generate a RedwoodRecord model.

```bash
yarn redwood generate model <name>
```

| Arguments & Options | Description                                         |
| ------------------- | --------------------------------------------------- |
| `name`              | Name of the model (in schema.prisma)                |
| `--force, -f`       | Overwrite existing files                            |
| `--rollback`        | Rollback changes if an error occurs [default: true] |

#### Usage

See the [RedwoodRecord docs](redwoodrecord.md).

#### Example

```bash
~/redwood-app$ yarn redwood generate model User
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g model User
✔ Generating model file...
✔ Successfully wrote file $(./api/src/models/User.js)
✔ Parsing datamodel, generating api/src/models/index.js...

Wrote /Users/rob/Sites/redwoodjs/redwood_record/.redwood/datamodel.json
Wrote /Users/rob/Sites/redwoodjs/redwood_record/api/src/models/index.js

✨ Done in 3.74s.
```

Generating a model automatically runs `yarn rw record init` as well.

### generate page

Generates a page component and updates the routes.

```bash
yarn redwood generate page < name > [path]
```

`path` can include a route parameter which will be passed to the generated
page. The syntax for that is `/path/to/page/{routeParam}/more/path`. You can
also specify the type of the route parameter if needed: `{routeParam:Int}`. If
`path` isn't specified, or if it's just a route parameter, it will be derived
from `name` and the route parameter, if specified, will be added to the end.

This also updates `Routes.js` in `./web/src`.

| Arguments & Options  | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `name`               | Name of the page                                                                     |
| `path`               | URL path to the page. Defaults to `name`                                             |
| `--force, -f`        | Overwrite existing files                                                             |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript |
| `--tests`            | Generate test files [default: true]                                                  |
| `--stories`          | Generate Storybook files [default: true]                                             |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                  |

**Destroying**

```
yarn redwood destroy page <name> [path]
```

**Examples**

Generating a home page:

```plaintext
~/redwood-app$ yarn redwood generate page home /
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g page home /
  ✔ Generating page files...
    ✔ Writing `./web/src/pages/HomePage/HomePage.test.js`...
    ✔ Writing `./web/src/pages/HomePage/HomePage.js`...
  ✔ Updating routes file...
Done in 1.02s.
```

The page returns jsx telling you where to find it:

```jsx title="./web/src/pages/HomePage/HomePage.js"
const HomePage = () => {
  return (
    <div>
      <h1>HomePage</h1>
      <p>Find me in ./web/src/pages/HomePage/HomePage.js</p>
    </div>
  )
}

export default HomePage
```

And the route is added to `Routes.js`:

```jsx {6} title="./web/src/Routes.js"
const Routes = () => {
  return (
    <Router>
      <Route path="/" page={HomePage} name="home" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}
```

Generating a page to show quotes:

```plaintext
~/redwood-app$ yarn redwood generate page quote {id}
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g page quote {id}
  ✔ Generating page files...
    ✔ Writing `./web/src/pages/QuotePage/QuotePage.stories.js`...
    ✔ Writing `./web/src/pages/QuotePage/QuotePage.test.js`...
    ✔ Writing `./web/src/pages/QuotePage/QuotePage.js`...
  ✔ Updating routes file...
Done in 1.02s.
```

The generated page will get the route parameter as a prop:

```jsx {5,12,14} title="./web/src/pages/QuotePage/QuotePage.js"
import { Link, routes } from '@redwoodjs/router'

const QuotePage = ({ id }) => {
  return (
    <>
      <h1>QuotePage</h1>
      <p>Find me in "./web/src/pages/QuotePage/QuotePage.js"</p>
      {/*
        My default route is named "quote", link to me with `
        <Link to={routes.quote({ id: 42 })}>Quote 42</Link>`
        The parameter passed to me is {id}
      */}
    </>
  )
}

export default QuotePage
```

And the route is added to `Routes.js`, with the route parameter added:

```jsx {6} title="./web/src/Routes.js"
const Routes = () => {
  return (
    <Router>
      <Route path="/quote/{id}" page={QuotePage} name="quote" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}
```

### generate realtime

Generate a boilerplate subscription or live query used with RedwoodJS Realtime.

```bash
yarn redwood generate realtime <name>
```

| Arguments & Options | Description                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `name`              | Name of the realtime event to setup.post`                                                        |
| `-t, --type`        | Choices: `liveQuery`, `subscription`. Optional. If not provided, you will be prompted to select. |
| `--force, -f`       | Overwrite existing files                                                                         |

#### Usage

See Realtime for more information on how to [setup RedwoodJS Realtime](#setup-realtime) and use Live Queries, and Subscriptions.

**Examples**

Generate a live query.

```bash
~/redwood-app$ yarn rw g realtime NewLiveQuery
? What type of realtime event would you like to create? › - Use arrow-keys. Return to submit.
❯ Live Query
Create a Live Query to watch for changes in data
Subscription

✔ What type of realtime event would you like to create? › Live Query
✔ Checking for realtime environment prerequisites ...
✔ Adding newlivequery example live query ...
✔ Generating types ...
```

Generate a subscription.

```bash
~/redwood-app$ yarn rw g realtime NewSub
? What type of realtime event would you like to create? › - Use arrow-keys. Return to submit.
Live Query
❯ Subscription - Create a Subscription to watch for events

✔ What type of realtime event would you like to create? › Subscription
✔ Checking for realtime environment prerequisites ...
✔ Adding newsub example subscription ...
✔ Generating types ...
```

### generate scaffold

Generate Pages, SDL, and Services files based on a given DB schema Model. Also accepts `<path/model>`.

```bash
yarn redwood generate scaffold <model>
```

A scaffold quickly creates a CRUD for a model by generating the following files and corresponding routes:

- sdl
- service
- layout
- pages
- cells
- components

The content of the generated components is different from what you'd get by running them individually.

| Arguments & Options  | Description                                                                                                                                                                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`              | Model to scaffold. You can also use `<path/model>` to nest files by type at the given path directory (or directories). For example, `redwood g scaffold admin/post`                                   |
| `--docs`             | Use or set to `true` to generated comments in SDL to use in self-documentating your app's GraphQL API. See: [Self-Documenting GraphQL API](./graphql.md#self-documenting-graphql-api) [default:false] |
| `--force, -f`        | Overwrite existing files                                                                                                                                                                              |
| `--tailwind`         | Generate TailwindCSS version of scaffold.css (automatically set to `true` if TailwindCSS config exists)                                                                                               |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript                                                                                                                  |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                                                                                                                                   |

#### Usage

See [Creating a Post Editor](tutorial/chapter2/getting-dynamic.md#creating-a-post-editor).

**Nesting of Components and Pages**

By default, redwood will nest the components and pages in a directory named as per the model. For example (where `post` is the model):
`yarn rw g scaffold post`
will output the following files, with the components and pages nested in a `Post` directory:

```plaintext {9-20}
  √ Generating scaffold files...
    √ Successfully wrote file `./api/src/graphql/posts.sdl.js`
    √ Successfully wrote file `./api/src/services/posts/posts.js`
    √ Successfully wrote file `./api/src/services/posts/posts.scenarios.js`
    √ Successfully wrote file `./api/src/services/posts/posts.test.js`
    √ Successfully wrote file `./web/src/layouts/PostsLayout/PostsLayout.js`
    √ Successfully wrote file `./web/src/pages/Post/EditPostPage/EditPostPage.js`
    √ Successfully wrote file `./web/src/pages/Post/PostPage/PostPage.js`
    √ Successfully wrote file `./web/src/pages/Post/PostsPage/PostsPage.js`
    √ Successfully wrote file `./web/src/pages/Post/NewPostPage/NewPostPage.js`
    √ Successfully wrote file `./web/src/components/Post/EditPostCell/EditPostCell.js`
    √ Successfully wrote file `./web/src/components/Post/Post/Post.js`
    √ Successfully wrote file `./web/src/components/Post/PostCell/PostCell.js`
    √ Successfully wrote file `./web/src/components/Post/PostForm/PostForm.js`
    √ Successfully wrote file `./web/src/components/Post/Posts/Posts.js`
    √ Successfully wrote file `./web/src/components/Post/PostsCell/PostsCell.js`
    √ Successfully wrote file `./web/src/components/Post/NewPost/NewPost.js`
  √ Adding layout import...
  √ Adding set import...
  √ Adding scaffold routes...
  √ Adding scaffold asset imports...
```

If it is not desired to nest the components and pages, then redwood provides an option that you can set to disable this for your project.
Add the following in your `redwood.toml` file to disable the nesting of components and pages.

```
[generate]
  nestScaffoldByModel = false
```

Setting the `nestScaffoldByModel = true` will retain the default behavior, but is not required.

Notes:

1. The nesting directory is always set to be PascalCase.

**Namespacing Scaffolds**

You can namespace your scaffolds by providing `<path/model>`. The layout, pages, cells, and components will be nested in newly created dir(s). In addition, the nesting folder, based upon the model name, is still applied after the path for components and pages, unless turned off in the `redwood.toml` as described above. For example, given a model `user`, running `yarn redwood generate scaffold admin/user` will nest the layout, pages, and components in a newly created `Admin` directory created for each of the `layouts`, `pages`, and `components` folders:

```plaintext {9-20}
~/redwood-app$ yarn redwood generate scaffold admin/user
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g scaffold admin/user
  ✔ Generating scaffold files...
    ✔ Successfully wrote file `./api/src/graphql/users.sdl.js`
    ✔ Successfully wrote file `./api/src/services/users/users.js`
    ✔ Successfully wrote file `./api/src/services/users/users.scenarios.js`
    ✔ Successfully wrote file `./api/src/services/users/users.test.js`
    ✔ Successfully wrote file `./web/src/layouts/Admin/UsersLayout/UsersLayout.js`
    ✔ Successfully wrote file `./web/src/pages/Admin/User/EditUserPage/EditUserPage.js`
    ✔ Successfully wrote file `./web/src/pages/Admin/User/UserPage/UserPage.js`
    ✔ Successfully wrote file `./web/src/pages/Admin/User/UsersPage/UsersPage.js`
    ✔ Successfully wrote file `./web/src/pages/Admin/User/NewUserPage/NewUserPage.js`
    ✔ Successfully wrote file `./web/src/components/Admin/User/EditUserCell/EditUserCell.js`
    ✔ Successfully wrote file `./web/src/components/Admin/User/User/User.js`
    ✔ Successfully wrote file `./web/src/components/Admin/User/UserCell/UserCell.js`
    ✔ Successfully wrote file `./web/src/components/Admin/User/UserForm/UserForm.js`
    ✔ Successfully wrote file `./web/src/components/Admin/User/Users/Users.js`
    ✔ Successfully wrote file `./web/src/components/Admin/User/UsersCell/UsersCell.js`
    ✔ Successfully wrote file `./web/src/components/Admin/User/NewUser/NewUser.js`
  ✔ Adding layout import...
  ✔ Adding set import...
  ✔ Adding scaffold routes...
  ✔ Adding scaffold asset imports...
Done in 1.21s.
```

The routes wrapped in the [`Set`](router.md#sets-of-routes) component with generated layout will be nested too:

```jsx {6-11} title="./web/src/Routes.js"
const Routes = () => {
  return (
    <Router>
      <Set wrap={UsersLayout}>
        <Route path="/admin/users/new" page={AdminUserNewUserPage} name="adminNewUser" />
        <Route path="/admin/users/{id:Int}/edit" page={AdminUserEditUserPage} name="adminEditUser" />
        <Route path="/admin/users/{id:Int}" page={AdminUserUserPage} name="adminUser" />
        <Route path="/admin/users" page={AdminUserUsersPage} name="adminUsers" />
      </Set>
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}
```

Notes:

1. Each directory in the scaffolded path is always set to be PascalCase.
2. The scaffold path may be multiple directories deep.

**Destroying**

```
yarn redwood destroy scaffold <model>
```

Notes:

1. You can also use `<path/model>` to destroy files that were generated under a scaffold path. For example, `redwood d scaffold admin/post`
2. The destroy command will remove empty folders along the path, provided they are lower than the folder level of component, layout, page, etc.
3. The destroy scaffold command will also follow the `nestScaffoldbyModel` setting in the `redwood.toml` file. For example, if you have an existing scaffold that you wish to destroy, that does not have the pages and components nested by the model name, you can destroy the scaffold by temporarily setting:

```
[generate]
  nestScaffoldByModel = false
```

**Troubleshooting**

If you see `Error: Unknown type: ...`, don't panic!
It's a known limitation with GraphQL type generation.
It happens when you generate the SDL of a Prisma model that has relations **before the SDL for the related model exists**.
Please see [Troubleshooting Generators](./schema-relations#troubleshooting-generators) for help.

### generate script

Generates an arbitrary Node.js script in `./scripts/<name>` that can be used with `redwood execute` command later.

| Arguments & Options  | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `name`               | Name of the service                                                                  |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                  |

Scripts have access to services and libraries used in your project. Some examples of how this can be useful:

- create special database seed scripts for different scenarios
- sync products and prices from your payment provider
- running cleanup jobs on a regular basis e.g. delete stale/expired data
- sync data between platforms e.g. email from your db to your email marketing platform

#### Usage

```
❯ yarn rw g script syncStripeProducts

  ✔ Generating script file...
    ✔ Successfully wrote file `./scripts/syncStripeProducts.ts`
  ✔ Next steps...

    After modifying your script, you can invoke it like:

      yarn rw exec syncStripeProducts

      yarn rw exec syncStripeProducts --param1 true
```

### generate sdl

Generate a GraphQL schema and service object.

```bash
yarn redwood generate sdl <model>
```

The sdl will inspect your `schema.prisma` and will do its best with relations. Schema to generators isn't one-to-one yet (and might never be).

| Arguments & Options  | Description                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `model`              | Model to generate the sdl for                                                                                                                                                                          |
| `--crud`             | Set to `false`, or use `--no-crud`, if you do not want to generate mutations                                                                                                                           |
| `--docs`             | Use or set to `true` to generated comments in SDL to use in self-documentating your app's GraphQL API. See: [Self-Documenting GraphQL API](./graphql.md#self-documenting-graphql-api) [default: false] |
| `--force, -f`        | Overwrite existing files                                                                                                                                                                               |
| `--tests`            | Generate service test and scenario [default: true]                                                                                                                                                     |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript                                                                                                                   |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                                                                                                                                    |

> **Note:** The generated sdl will include the `@requireAuth` directive by default to ensure queries and mutations are secure. If your app's queries and mutations are all public, you can set up a custom SDL generator template to apply `@skipAuth` (or a custom validator directive) to suit you application's needs.

**Regenerating the SDL**

Often, as you iterate on your data model, you may add, remove, or rename fields. You still want Redwood to update the generated SDL and service files for those updates because it saves time not having to make those changes manually.

But, since the `generate` command prevents you from overwriting files accidentally, you use the `--force` option -- but a `force` will reset any test and scenarios you may have written which you don't want to lose.

In that case, you can run the following to "regenerate" **just** the SDL file and leave your tests and scenarios intact and not lose your hard work.

```
yarn redwood g sdl <model> --force --no-tests
```

#### Example

```bash
~/redwood-app$ yarn redwood generate sdl user --force --no-tests
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g sdl user
✔ Generating SDL files...
✔ Writing $(./api/src/graphql/users.sdl.js)...
✔ Writing $(./api/src/services/users/users.js)...
Done in 1.04s.
```

**Destroying**

```
yarn redwood destroy sdl <model>
```

#### Example

Generating a user sdl:

```bash
~/redwood-app$ yarn redwood generate sdl user
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g sdl user
✔ Generating SDL files...
✔ Writing $(./api/src/graphql/users.sdl.js)...
✔ Writing $(./api/src/services/users/users.scenarios.js)...
✔ Writing $(./api/src/services/users/users.test.js)...
✔ Writing $(./api/src/services/users/users.js)...
Done in 1.04s.
```

The generated sdl defines a corresponding type, query, create/update inputs, and any mutations. To prevent defining mutations, add the `--no-crud` option.

```jsx title="./api/src/graphql/users.sdl.js"
export const schema = gql`
  type User {
    id: Int!
    email: String!
    name: String
  }

  type Query {
    users: [User!]! @requireAuth
  }

  input CreateUserInput {
    email: String!
    name: String
  }

  input UpdateUserInput {
    email: String
    name: String
  }

  type Mutation {
    createUser(input: CreateUserInput!): User! @requireAuth
    updateUser(id: Int!, input: UpdateUserInput!): User! @requireAuth
    deleteUser(id: Int!): User! @requireAuth
  }
`
```

The services file fulfills the query. If the `--no-crud` option is added, this file will be less complex.

```jsx title="./api/src/services/users/users.js"
import { db } from 'src/lib/db'

export const users = () => {
  return db.user.findMany()
}
```

For a model with a relation, the field will be listed in the sdl:

```jsx {8} title="./api/src/graphql/users.sdl.js"
export const schema = gql`
  type User {
    id: Int!
    email: String!
    name: String
    profile: Profile
  }

  type Query {
    users: [User!]! @requireAuth
  }

  input CreateUserInput {
    email: String!
    name: String
  }

  input UpdateUserInput {
    email: String
    name: String
  }

  type Mutation {
    createUser(input: CreateUserInput!): User! @requireAuth
    updateUser(id: Int!, input: UpdateUserInput!): User! @requireAuth
    deleteUser(id: Int!): User! @requireAuth
  }
`
```

And the service will export an object with the relation as a property:

```jsx {9-13} title="./api/src/services/users/users.js"
import { db } from 'src/lib/db'

export const users = () => {
  return db.user.findMany()
}

export const User = {
  profile: (_obj, { root }) => {
    db.user.findUnique({ where: { id: root.id } }).profile(),
  }
}
```

**Troubleshooting**

If you see `Error: Unknown type: ...`, don't panic!
It's a known limitation with GraphQL type generation.
It happens when you generate the SDL of a Prisma model that has relations **before the SDL for the related model exists**.
Please see [Troubleshooting Generators](./schema-relations#troubleshooting-generators) for help.

### generate secret

Generate a secret key using a cryptographically-secure source of entropy. Commonly used when setting up dbAuth.

| Arguments & Options | Description                                        |
| :------------------ | :------------------------------------------------- |
| `--raw`             | Print just the key, without any informational text |

#### Usage

Using the `--raw` option you can easily append a secret key to your .env file, like so:

```
# yarn v1
echo "SESSION_SECRET=$(yarn --silent rw g secret --raw)" >> .env

# yarn v3
echo "SESSION_SECRET=$(yarn rw g secret --raw)" >> .env
```

### generate service

Generate a service component.

```bash
yarn redwood generate service <name>
```

Services are where Redwood puts its business logic. They can be used by your GraphQL API or any other place in your backend code. See [How Redwood Works with Data](tutorial/chapter2/side-quest.md).

| Arguments & Options  | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `name`               | Name of the service                                                                  |
| `--force, -f`        | Overwrite existing files                                                             |
| `--typescript, --ts` | Generate TypeScript files Enabled by default if we detect your project is TypeScript |
| `--tests`            | Generate test and scenario files [default: true]                                     |
| `--rollback`         | Rollback changes if an error occurs [default: true]                                  |

**Destroying**

```
yarn redwood destroy service <name>
```

#### Example

Generating a user service:

```bash
~/redwood-app$ yarn redwood generate service user
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood g service user
✔ Generating service files...
✔ Writing $(./api/src/services/users/users.scenarios.js)...
✔ Writing $(./api/src/services/users/users.test.js)...
✔ Writing $(./api/src/services/users/users.js)...
Done in 1.02s.
```

The generated service component will export a `findMany` query:

```jsx title="./api/src/services/users/users.js"
import { db } from 'src/lib/db'

export const users = () => {
  return db.user.findMany()
}
```

### generate types

Generates supplementary code (project types)

```bash
yarn redwood generate types
```

#### Usage

```
~/redwood-app$ yarn redwood generate types
yarn run v1.22.10
$ /redwood-app/node_modules/.bin/redwood g types
$ /redwood-app/node_modules/.bin/rw-gen

Generating...

- .redwood/schema.graphql
- .redwood/types/mirror/api/src/services/posts/index.d.ts
- .redwood/types/mirror/web/src/components/BlogPost/index.d.ts
- .redwood/types/mirror/web/src/layouts/BlogLayout/index.d.ts
...
- .redwood/types/mirror/web/src/components/Post/PostsCell/index.d.ts
- .redwood/types/includes/web-routesPages.d.ts
- .redwood/types/includes/all-currentUser.d.ts
- .redwood/types/includes/web-routerRoutes.d.ts
- .redwood/types/includes/api-globImports.d.ts
- .redwood/types/includes/api-globalContext.d.ts
- .redwood/types/includes/api-scenarios.d.ts
- api/types/graphql.d.ts
- web/types/graphql.d.ts

... and done.
```

## info

Print your system environment information.

```bash
yarn redwood info
```

This command's primarily intended for getting information others might need to know to help you debug:

```bash
~/redwood-app$ yarn redwood info
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/redwood info

  System:
    OS: Linux 5.4 Ubuntu 20.04 LTS (Focal Fossa)
    Shell: 5.0.16 - /usr/bin/bash
  Binaries:
    Node: 13.12.0 - /tmp/yarn--1589998865777-0.9683603763419713/node
    Yarn: 1.22.4 - /tmp/yarn--1589998865777-0.9683603763419713/yarn
  Browsers:
    Chrome: 78.0.3904.108
    Firefox: 76.0.1
  npmPackages:
    @redwoodjs/core: ^0.7.0-rc.3 => 0.7.0-rc.3

Done in 1.98s.
```

## lint

Lint your files.

```bash
yarn redwood lint
```

[Our ESLint configuration](https://github.com/redwoodjs/redwood/blob/master/packages/eslint-config/index.js) is a mix of [ESLint's recommended rules](https://eslint.org/docs/rules/), [React's recommended rules](https://www.npmjs.com/package/eslint-plugin-react#list-of-supported-rules), and a bit of our own stylistic flair:

- no semicolons
- comma dangle when multiline
- single quotes
- always use parenthesis around arrow functions
- enforced import sorting

| Option  | Description       |
| :------ | :---------------- |
| `--fix` | Try to fix errors |

## prisma

Run Prisma CLI within the context of a Redwood project.

```
yarn redwood prisma
```

Redwood's `prisma` command is a lightweight wrapper around the Prisma CLI. It's the primary way you interact with your database.

> **What do you mean it's a lightweight wrapper?**
>
> By lightweight wrapper, we mean that we're handling some flags under the hood for you.
> You can use the Prisma CLI directly (`yarn prisma`), but letting Redwood act as a proxy (`yarn redwood prisma`) saves you a lot of keystrokes.
> For example, Redwood adds the `--schema=api/db/schema.prisma` flags automatically.
>
> If you want to know exactly what `yarn redwood prisma <command>` runs, which flags it's passing, etc., it's right at the top:
>
> ```sh{3}
> $ yarn redwood prisma migrate dev
> yarn run v1.22.10
> $ ~/redwood-app/node_modules/.bin/redwood prisma migrate dev
> Running prisma cli:
> yarn prisma migrate dev --schema "~/redwood-app/api/db/schema.prisma"
> ...
> ```

Since `yarn redwood prisma` is just an entry point into all the database commands that the Prisma CLI has to offer, we won't try to provide an exhaustive reference of everything you can do with it here. Instead what we'll do is focus on some of the most common commands; those that you'll be running on a regular basis, and how they fit into Redwood's workflows.

For the complete list of commands, see the [Prisma CLI Reference](https://www.prisma.io/docs/reference/api-reference/command-reference). It's the authority.

Along with the CLI reference, bookmark Prisma's [Migration Flows](https://www.prisma.io/docs/concepts/components/prisma-migrate/prisma-migrate-flows) doc&mdash;it'll prove to be an invaluable resource for understanding `yarn redwood prisma migrate`.

| Command             | Description                                                  |
| :------------------ | :----------------------------------------------------------- |
| `db <command>`      | Manage your database schema and lifecycle during development |
| `generate`          | Generate artifacts (e.g. Prisma Client)                      |
| `migrate <command>` | Update the database schema with migrations                   |

### prisma db

Manage your database schema and lifecycle during development.

```
yarn redwood prisma db <command>
```

The `prisma db` namespace contains commands that operate directly against the database.

#### prisma db pull

Pull the schema from an existing database, updating the Prisma schema.

> 👉 Quick link to the [Prisma CLI Reference](https://www.prisma.io/docs/reference/api-reference/command-reference#db-pull).

```
yarn redwood prisma db pull
```

This command, formerly `introspect`, connects to your database and adds Prisma models to your Prisma schema that reflect the current database schema.

> Warning: The command will Overwrite the current schema.prisma file with the new schema. Any manual changes or customization will be lost. Be sure to back up your current schema.prisma file before running `db pull` if it contains important modifications.

#### prisma db push

Push the state from your Prisma schema to your database.

> 👉 Quick link to the [Prisma CLI Reference](https://www.prisma.io/docs/reference/api-reference/command-reference#db-push).

```
yarn redwood prisma db push
```

This is your go-to command for prototyping changes to your Prisma schema (`schema.prisma`).
Prior to to `yarn redwood prisma db push`, there wasn't a great way to try out changes to your Prisma schema without creating a migration.
This command fills the void by "pushing" your `schema.prisma` file to your database without creating a migration. You don't even have to run `yarn redwood prisma generate` afterward&mdash;it's all taken care of for you, making it ideal for iterative development.

#### prisma db seed

Seed your database.

> 👉 Quick link to the [Prisma CLI Reference](https://www.prisma.io/docs/reference/api-reference/command-reference#db-seed-preview).

```
yarn redwood prisma db seed
```

This command seeds your database by running your project's `seed.js|ts` file which you can find in your `scripts` directory.

Prisma's got a great [seeding guide](https://www.prisma.io/docs/guides/prisma-guides/seed-database) that covers both the concepts and the nuts and bolts.

> **Important:** Prisma Migrate also triggers seeding in the following scenarios:
>
> - you manually run the `yarn redwood prisma migrate reset` command
> - the database is reset interactively in the context of using `yarn redwood prisma migrate dev`—for example, as a result of migration history conflicts or database schema drift
>
> If you want to use `yarn redwood prisma migrate dev` or `yarn redwood prisma migrate reset` without seeding, you can pass the `--skip-seed` flag.

While having a great seed might not be all that important at the start, as soon as you start collaborating with others, it becomes vital.

**How does seeding actually work?**

If you look at your project's `package.json` file, you'll notice a `prisma` section:

```json
  "prisma": {
    "seed": "yarn rw exec seed"
  },
```

Prisma runs any command found in the `seed` setting when seeding via `yarn rw prisma db seed` or `yarn rw prisma migrate reset`.
Here we're using the Redwood [`exec` cli command](#exec) that runs a script.

If you wanted to seed your database using a different method (like `psql` and an `.sql` script), you can do so by changing the "seed" script command.

**More About Seeding**

In addition, you can [code along with Ryan Chenkie](https://www.youtube.com/watch?v=2LwTUIqjbPo), and learn how libraries like [faker](https://www.npmjs.com/package/faker) can help you create a large, realistic database fast, especially in tandem with Prisma's [createMany](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#createmany).

**Log Formatting**

If you use the Redwood Logger as part of your seed script, you can pipe the command to the LogFormatter to output prettified logs.

For example, if your `scripts.seed.js` imports the `logger`:

```jsx title="scripts/seed.js"
import { db } from 'api/src/lib/db'
import { logger } from 'api/src/lib/logger'

export default async () => {
  try {
    const posts = [
      {
        title: 'Welcome to the blog!',
        body: "I'm baby single- origin coffee kickstarter lo.",
      },
      {
        title: 'A little more about me',
        body: 'Raclette shoreditch before they sold out lyft.',
      },
      {
        title: 'What is the meaning of life?',
        body: 'Meh waistcoat succulents umami asymmetrical, hoodie post-ironic paleo chillwave tote bag.',
      },
    ]

    Promise.all(
      posts.map(async (post) => {
        const newPost = await db.post.create({
          data: { title: post.title, body: post.body },
        })

        logger.debug({ data: newPost }, 'Added post')
      })
    )
  } catch (error) {
    logger.error(error)
  }
}
```

You can pipe the script output to the formatter:

```bash
yarn rw prisma db seed | yarn rw-log-formatter
```

> Note: Just be sure to set `data` attribute, so the formatter recognizes the content.
> For example: `logger.debug({ data: newPost }, 'Added post')`

### prisma migrate

Update the database schema with migrations.

> 👉 Quick link to the [Prisma Concepts](https://www.prisma.io/docs/concepts/components/prisma-migrate).

```
yarn redwood prisma migrate <command>
```

As a database toolkit, Prisma strives to be as holistic as possible. Prisma Migrate lets you use Prisma schema to make changes to your database declaratively, all while keeping things deterministic and fully customizable by generating the migration steps in a simple, familiar format: SQL.

Since migrate generates plain SQL files, you can edit those SQL files before applying the migration using `yarn redwood prisma migrate --create-only`. This creates the migration based on the changes in the Prisma schema, but doesn't apply it, giving you the chance to go in and make any modifications you want. [Daniel Norman's tour of Prisma Migrate](https://www.youtube.com/watch?v=0LKhksstrfg) demonstrates this and more to great effect.

Prisma Migrate has separate commands for applying migrations based on whether you're in dev or in production. The Prisma [Migration flows](https://www.prisma.io/docs/concepts/components/prisma-migrate/prisma-migrate-flows) goes over the difference between these workflows in more detail.

#### prisma migrate dev

Create a migration from changes in Prisma schema, apply it to the database, trigger generators (e.g. Prisma Client).

> 👉 Quick link to the [Prisma CLI Reference](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-dev).

```
yarn redwood prisma migrate dev
```

#### prisma migrate deploy

Apply pending migrations to update the database schema in production/staging.

> 👉 Quick link to the [Prisma CLI Reference](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-deploy).

```
yarn redwood prisma migrate deploy
```

#### prisma migrate reset

This command deletes and recreates the database, or performs a "soft reset" by removing all data, tables, indexes, and other artifacts.

It'll also re-seed your database by automatically running the `db seed` command. See [prisma db seed](#prisma-db-seed).

> **_Important:_** For use in development environments only

## record

> This command is experimental and its behavior may change.

Commands for working with RedwoodRecord.

### record init

Parses `schema.prisma` and caches the datamodel as JSON. Reads relationships between models and adds some configuration in `api/src/models/index.js`.

```
yarn rw record init
```

## redwood-tools (alias rwt)

Redwood's companion CLI development tool. You'll be using this if you're contributing to Redwood. See [Contributing](https://github.com/redwoodjs/redwood/blob/main/CONTRIBUTING.md#cli-reference-redwood-tools) in the Redwood repo.

## setup

Initialize configuration and integrate third-party libraries effortlessly.

```
yarn redwood setup <category>
```

| Commands           | Description                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| `auth`             | Set up auth configuration for a provider                                                   |
| `cache`            | Set up cache configuration for memcached or redis                                          |
| `custom-web-index` | Set up an `index.js` file, so you can customize how Redwood web is mounted in your browser |
| `deploy`           | Set up a deployment configuration for a provider                                           |
| `generator`        | Copy default Redwood generator templates locally for customization                         |
| `i18n`             | Set up i18n                                                                                |
| `jobs`             | Set up background job creation and processing                                              |
| `package`          | Peform setup actions by running a third-party npm package                                  |
| `tsconfig`         | Add relevant tsconfig so you can start using TypeScript                                    |
| `ui`               | Set up a UI design or style library                                                        |

### setup auth

Integrate an auth provider.

```
yarn redwood setup auth <provider>
```

| Arguments & Options | Description                                                                                                                                                                   |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`          | Auth provider to configure. Choices are `auth0`, `azureActiveDirectory`, `clerk`, `dbAuth`, `ethereum`, `firebase`, `goTrue`, `magicLink`, `netlify`, `nhost`, and `supabase` |
| `--force, -f`       | Overwrite existing configuration                                                                                                                                              |

#### Usage

See [Authentication](authentication.md).

### setup cache

This command creates a setup file in `api/src/lib/cache.{ts|js}` for connecting to a Memcached or Redis server and allows caching in services. See the [**Caching** section of the Services docs](/docs/services#caching) for usage.

```
yarn redwood setup cache <client>
```

| Arguments & Options | Description                                             |
| :------------------ | :------------------------------------------------------ |
| `client`            | Name of the client to configure, `memcached` or `redis` |
| `--force, -f`       | Overwrite existing files                                |

### setup generator

Copies a given generator's template files to your local app for customization. The next time you generate that type again, it will use your custom template instead of Redwood's default.

```
yarn rw setup generator <name>
```

| Arguments & Options | Description                                                   |
| :------------------ | :------------------------------------------------------------ |
| `name`              | Name of the generator template(s) to copy (see help for list) |
| `--force, -f`       | Overwrite existing copied template files                      |

#### Usage

If you wanted to customize the page generator template, run the command:

```
yarn rw setup generator page
```

And then check `web/generators/page` for the page, storybook and test template files. You don't need to keep all of these templates—you could customize just `page.tsx.template` and delete the others and they would still be generated, but using the default Redwood templates.

The only exception to this rule is the scaffold templates. You'll get four directories, `assets`, `components`, `layouts` and `pages`. If you want to customize any one of the templates in those directories, you will need to keep all the other files inside of that same directory, even if you make no changes besides the one you care about. (This is due to the way the scaffold looks up its template files.) For example, if you wanted to customize only the index page of the scaffold (the one that lists all available records in the database) you would edit `web/generators/scaffold/pages/NamesPage.tsx.template` and keep the other pages in that directory. You _could_ delete the other three directories (`assets`, `components`, `layouts`) if you don't need to customize them.

**Name Variants**

Your template will receive the provided `name` in a number of different variations.

For example, given the name `fooBar` your template will receive the following _variables_ with the given _values_

| Variable               | Value      |
| :--------------------- | :--------- |
| `pascalName`           | `FooBar`   |
| `camelName`            | `fooBar`   |
| `singularPascalName`   | `FooBar`   |
| `pluralPascalName`     | `FooBars`  |
| `singularCamelName`    | `fooBar`   |
| `pluralCamelName`      | `fooBars`  |
| `singularParamName`    | `foo-bar`  |
| `pluralParamName`      | `foo-bars` |
| `singularConstantName` | `FOO_BAR`  |
| `pluralConstantName`   | `FOO_BARS` |

#### Example

Copying the cell generator templates:

```bash
~/redwood-app$ yarn rw setup generator cell
yarn run v1.22.4
$ /redwood-app/node_modules/.bin/rw setup generator cell
✔ Copying generator templates...
✔ Wrote templates to /web/generators/cell
✨ Done in 2.33s.
```

### setup deploy (config)

Set up a deployment configuration.

```
yarn redwood setup deploy <provider>
```

| Arguments & Options | Description                                                                                                                                                    |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`          | Deploy provider to configure. Choices are `baremetal`, `coherence`, `edgio`, `flightcontrol`, `netlify`, `render`, `vercel`, or `aws-serverless [deprecated]`, |
| `--database, -d`    | Database deployment for Render only [choices: "none", "postgresql", "sqlite"] [default: "postgresql"]                                                          |
| `--force, -f`       | Overwrite existing configuration [default: false]                                                                                                              |

#### setup deploy netlify

When configuring Netlify deployment, the `setup deploy netlify` command generates a `netlify.toml` [configuration file](https://docs.netlify.com/configure-builds/file-based-configuration/) with the defaults needed to build and deploy a RedwoodJS site on Netlify.

The `netlify.toml` file is a configuration file that specifies how Netlify builds and deploys your site — including redirects, branch and context-specific settings, and more.

This configuration file also defines the settings needed for [Netlify Dev](https://docs.netlify.com/configure-builds/file-based-configuration/#netlify-dev) to detect that your site uses the RedwoodJS framework. Netlify Dev serves your RedwoodJS app as if it runs on the Netlify platform and can serve functions, handle Netlify [headers](https://docs.netlify.com/configure-builds/file-based-configuration/#headers) and [redirects](https://docs.netlify.com/configure-builds/file-based-configuration/#redirects).

Netlify Dev can also create a tunnel from your local development server that allows you to share and collaborate with others using `netlify dev --live`.

```
// See: netlify.toml
// ...
[dev]
  # To use [Netlify Dev](https://www.netlify.com/products/dev/),
  # install netlify-cli from https://docs.netlify.com/cli/get-started/#installation
  # and then use netlify link https://docs.netlify.com/cli/get-started/#link-and-unlink-sites
  # to connect your local project to a site already on Netlify
  # then run netlify dev and our app will be accessible on the port specified below
  framework = "redwoodjs"
  # Set targetPort to the [web] side port as defined in redwood.toml
  targetPort = 8910
  # Point your browser to this port to access your RedwoodJS app
  port = 8888
```

In order to use [Netlify Dev](https://www.netlify.com/products/dev/) you need to:

- install the latest [netlify-cli](https://docs.netlify.com/cli/get-started/#installation)
- use [netlify link](https://docs.netlify.com/cli/get-started/#link-and-unlink-sites) to connect to your Netlify site
- ensure that the `targetPort` matches the [web] side port in `redwood.toml`
- run `netlify dev` and your site will be served on the specified `port` (e.g., 8888)
- if you wish to share your local server with others, you can run `netlify dev --live`

> Note: To detect the RedwoodJS framework, please use netlify-cli v3.34.0 or greater.

### setup jobs

This command adds the necessary packages and files defining the configuration for Redwood's [Background Jobs](background-jobs) processing.

```
yarn redwood setup jobs
```

| Arguments & Options | Description              |
| :------------------ | :----------------------- |
| `--force, -f`       | Overwrite existing files |

### setup mailer

This command adds the necessary packages and files to get started using the RedwoodJS mailer. By default it also creates an example mail template which can be skipped with the `--skip-examples` flag.

```
yarn redwood setup mailer
```

| Arguments & Options | Description                                                    |
| :------------------ | :------------------------------------------------------------- |
| `--force, -f`       | Overwrite existing files                                       |
| `--skip-examples`   | Do not include example content, such as a React email template |

### setup package

This command takes a published npm package that you specify, performs some compatibility checks, and then executes its bin script. This allows you to use third-party packages that can provide you with an easy-to-use setup command for the particular functionality they provide.

This command behaves similarly to `yarn dlx` but will attempt to confirm compatibility between the package you are attempting to run and the current version of Redwood you are running. You can bypass this check by passing the `--force` flag if you feel you understand any potential compatibility issues.

```
yarn redwood setup package <npm-package>
```

| Arguments & Options | Description                |
| :------------------ | :------------------------- |
| `--force, -f`       | Forgo compatibility checks |

#### Usage

Run the made up `@redwoodjs/setup-example` package:

```bash
~/redwood-app$ yarn rw setup package @redwoodjs/setup-example
```

Run the same package but using a particular npm tag and avoiding any compatibility checks:

```bash
~/redwood-app$ yarn rw setup package @redwoodjs/setup-example@beta --force
```

**Compatibility Checks**

We perform a simple compatibility check in an attempt to make you aware of potential compatibility issues with setup packages you might wish to run. This works by examining the version of `@redwoodjs/core` you are using within your root `package.json`. We compare this value with a compatibility range the npm package specifies in the `engines.redwoodjs` field of its own `package.json`. If the version of `@redwoodjs/core` you are using falls outside of the compatibility range specified by the package you are attempting to run, we will warn you and ask you to confirm that you wish to continue.

It's the author of the npm package's responsibility to specify the correct compatibility range, so **you should always research the packages you use with this command**. Especially since they will be executing code on your machine!

### setup graphql

This command creates the necessary files to support GraphQL features like fragments and trusted documents.

#### Usage

Run `yarn rw setup graphql <feature>`

#### setup graphql fragments

This command creates the necessary configuration to start using [GraphQL Fragments](./graphql/fragments.md).

```
yarn redwood setup graphql fragments
```

| Arguments & Options | Description                              |
| :------------------ | :--------------------------------------- |
| `--force, -f`       | Overwrite existing files and skip checks |

#### Usage

Run `yarn rw setup graphql fragments`

#### Example

```bash
~/redwood-app$ yarn rw setup graphql fragments
✔ Update Redwood Project Configuration to enable GraphQL Fragments
✔ Generate possibleTypes.ts
✔ Import possibleTypes in App.tsx
✔ Add possibleTypes to the GraphQL cache config
```

#### setup graphql trusted-documents

This command creates the necessary configuration to start using [GraphQL Trusted Documents](./graphql/trusted-documents.md).

```
yarn redwood setup graphql trusted-documents
```

#### Usage

Run `yarn rw setup graphql trusted-documents`

#### Example

```bash
~/redwood-app$ yarn rw setup graphql trusted-documents
✔ Update Redwood Project Configuration to enable GraphQL Trusted Documents ...
✔ Generating Trusted Documents store ...
✔ Configuring the GraphQL Handler to use a Trusted Documents store ...
```

If you have not setup the RedwoodJS server file, it will be setup:

```bash
✔ Adding the experimental server file...
✔ Adding config to redwood.toml...
✔ Adding required api packages...
```

### setup realtime

This command creates the necessary files, installs the required packages, and provides examples to setup RedwoodJS Realtime from GraphQL live queries and subscriptions. See the Realtime docs for more information.

```
yarn redwood setup realtime
```

| Arguments & Options                 | Description                                                                        |
| :---------------------------------- | :--------------------------------------------------------------------------------- |
| `-e, --includeExamples, --examples` | Include examples of how to implement liveQueries and subscriptions. Default: true. |
| `--force, -f`                       | Forgo compatibility checks                                                         |

:::note

If the RedwoodJS Server is not setup, it will be installed as well.

:::

#### Usage

Run `yarn rw setup realtime`

#### Example

```bash
~/redwood-app$ yarn rw setup realtime
✔ Checking for realtime environment prerequisites ...
✔ Adding required api packages...
✔ Adding the realtime api lib ...
✔ Adding Countdown example subscription ...
✔ Adding NewMessage example subscription ...
✔ Adding Auctions example live query ...
✔ Generating types ...
```

If you have not setup the RedwoodJS server file, it will be setup:

```bash
✔ Adding the experimental server file...
✔ Adding config to redwood.toml...
✔ Adding required api packages...
```

### setup tsconfig

Add a `tsconfig.json` to both the web and api sides so you can start using [TypeScript](typescript/index).

```
yarn redwood setup tsconfig
```

| Arguments & Options | Description              |
| :------------------ | :----------------------- |
| `--force, -f`       | Overwrite existing files |

### setup ui

Set up a UI design or style library. Right now the choices are [TailwindCSS](https://tailwindcss.com/), [Chakra UI](https://chakra-ui.com/), and [Mantine UI](https://ui.mantine.dev/).

```
yarn rw setup ui <library>
```

| Arguments & Options | Description                                                                 |
| :------------------ | :-------------------------------------------------------------------------- |
| `library`           | Library to configure. Choices are `chakra-ui`, `tailwindcss`, and `mantine` |
| `--force, -f`       | Overwrite existing configuration                                            |

## storybook

Starts Storybook locally

```bash
yarn redwood storybook
```

[Storybook](https://storybook.js.org/docs/6/get-started/install) is a tool for UI development that allows you to develop your components in isolation, away from all the conflated cruft of your real app.

> "Props in, views out! Make it simple to reason about."

RedwoodJS supports Storybook by creating stories when generating cells, components, layouts and pages. You can then use these to describe how to render that UI component with representative data.

| Arguments & Options | Description                                                                                        |
| :------------------ | :------------------------------------------------------------------------------------------------- |
| `--open`            | Open Storybook in your browser on start [default: true]. Pass `--no-open` to disable this behavior |
| `--build`           | Build Storybook                                                                                    |
| `--port`            | Which port to run Storybook on [default: 7910]                                                     |

## test

Run Jest tests for api and web.

```bash
yarn redwood test [side..]
```

| Arguments & Options | Description                                                                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sides or filter`   | Which side(s) to test, and/or a regular expression to match against your test files to filter by                                                                                                                                                            |
| `--help`            | Show help                                                                                                                                                                                                                                                   |
| `--version`         | Show version number                                                                                                                                                                                                                                         |
| `--watch`           | Run tests related to changed files based on hg/git (uncommitted files). Specify the name or path to a file to focus on a specific set of tests [default: true]                                                                                              |
| `--watchAll`        | Run all tests                                                                                                                                                                                                                                               |
| `--collectCoverage` | Show test coverage summary and output info to `coverage` directory in project root. See this directory for an .html coverage report                                                                                                                         |
| `--clearCache`      | Delete the Jest cache directory and exit without running tests                                                                                                                                                                                              |
| `--db-push`         | Syncs the test database with your Prisma schema without requiring a migration. It creates a test database if it doesn't already exist [default: true]. This flag is ignored if your project doesn't have an `api` side. [👉 More details](#prisma-db-push). |

> **Note** all other flags are passed onto the jest cli. So for example if you wanted to update your snapshots you can pass the `-u` flag

## type-check (alias tsc or tc)

Runs a TypeScript compiler check on both the api and the web sides.

```bash
yarn redwood type-check [side]
```

| Arguments & Options | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `side`              | Which side(s) to run. Choices are `api` and `web`. Defaults to `api` and `web` |

#### Usage

See [Running Type Checks](typescript/introduction.md#running-type-checks).

## serve

Runs a server that serves both the api and the web sides.

```bash
yarn redwood serve [side]
```

> You should run `yarn rw build` before running this command to make sure all the static assets that will be served have been built.

`yarn rw serve` is useful for debugging locally or for self-hosting—deploying a single server into a serverful environment. Since both the api and the web sides run in the same server, CORS isn't a problem.

| Arguments & Options | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| `side`              | Which side(s) to run. Choices are `api` and `web`. Defaults to `api` and `web` |
| `--port`            | What port should the server run on [default: 8911]                             |
| `--socket`          | The socket the server should run. This takes precedence over port              |

### serve api

Runs a server that only serves the api side.

```
yarn rw serve api
```

This command uses `apiUrl` in your `redwood.toml`. Use this command if you want to run just the api side on a server (e.g. running on Render).

| Arguments & Options | Description                                                       |
| ------------------- | ----------------------------------------------------------------- |
| `--port`            | What port should the server run on [default: 8911]                |
| `--socket`          | The socket the server should run. This takes precedence over port |
| `--apiRootPath`     | The root path where your api functions are served                 |

For the full list of Server Configuration settings, see [this documentation](app-configuration-redwood-toml.md#api).
If you want to format your log output, you can pipe the command to the Redwood LogFormatter:

```
yarn rw serve api | yarn rw-log-formatter
```

### serve web

Runs a server that only serves the web side.

```
yarn rw serve web
```

This command serves the contents in `web/dist`. Use this command if you're debugging (e.g. great for debugging prerender) or if you want to run your api and web sides on separate servers, which is often considered a best practice for scalability (since your api side likely has much higher scaling requirements).

> **But shouldn't I use nginx and/or equivalent technology to serve static files?**
>
> Probably, but it can be a challenge to setup when you just want something running quickly!

| Arguments & Options | Description                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| `--port`            | What port should the server run on [default: 8911]                                    |
| `--socket`          | The socket the server should run. This takes precedence over port                     |
| `--apiHost`         | Forwards requests from the `apiUrl` (defined in `redwood.toml`) to the specified host |

If you want to format your log output, you can pipe the command to the Redwood LogFormatter:

```
yarn rw serve web | yarn rw-log-formatter
```

## upgrade

Upgrade all `@redwoodjs` packages via an interactive CLI.

```bash
yarn redwood upgrade
```

This command does all the heavy-lifting of upgrading to a new release for you.

Besides upgrading to a new stable release, you can use this command to upgrade to either of our unstable releases, `canary` and `rc`, or you can upgrade to a specific release version.

A canary release is published to npm every time a PR is merged to the `main` branch, and when we're getting close to a new release, we publish release candidates.

| Option          | Description                                                                                                                                                                                                                                                                                |
| :-------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dry-run, -d` | Check for outdated packages without upgrading                                                                                                                                                                                                                                              |
| `--tag, -t`     | Choices are "rc", "canary", "latest", "next", "experimental", or a specific version (e.g. "0.19.3"). WARNING: Unstable releases in the case of "canary", "rc", "next", and "experimental". And "canary" releases include breaking changes often requiring codemods if upgrading a project. |

#### Example

Upgrade to the most recent canary:

```bash
yarn redwood upgrade -t canary
```

Upgrade to a specific version:

```bash
yarn redwood upgrade -t 0.19.3
```

## Background checks

The CLI can check for things in the background, like new versions of the framework, while you dev.

Right now it can only check for new versions.
If you'd like it to do so, set `notifications.versionUpdates` in the `redwood.toml` file to include an array of the tags you're interested in hearing about.
(The former has priority.)

By default, the CLI won't check for upgrades—you have to opt into it.

You'll see this notification once a day at most. And the CLI will check for it once a day at most. So, nothing heavy-handed going on here.
