# .redwood

## What is this directory?

Redwood uses this `.redwood` directory to store transitory data that aids in the smooth and convenient operation of your Redwood project.

## Do I need to do anything with this directory?

No. You shouldn't have to create, edit or delete anything in this directory in your day-to-day work with Redwood.

You don't need to commit any other contents of this directory to your version control system. It's ignored by default.

## What's in this directory?

### Files

| Name              | Description                                                                                                        |
| :---------------- | :----------------------------------------------------------------------------------------------------------------- |
| commandCache.json | This file contains mappings to assist the Redwood CLI in efficiently executing commands.                           |
| schema.graphql    | This is the GraphQL schema which has been automatically generated from your Redwood project.                       |
| telemetry.txt     | Contains a unique ID used for telemetry. This value is rotated every 24 hours to protect your project's anonymity. |
| test.db           | The sqlite database used when running tests.                                                                       |

### Directories

| Name        | Description                                                                                                                                      |
| :---------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| locks       | Stores temporary files that Redwood uses to keep track of the execution of async/background tasks between processes.                             |
| logs        | Stores log files for background tasks such as update checking.                                                                                   |
| prebuild    | Stores transpiled JavaScript that is generated as part of Redwood's build process.                                                               |
| telemetry   | Stores the recent telemetry that the Redwood CLI has generated. You may inspect these files to see everything Redwood is anonymously collecting. |
| types       | Stores the results of type generation.                                                                                                           |
| updateCheck | Stores a file which contains the results of checking for Redwood updates.                                                                        |
| studio      | Used to store data for `rw studio`                                                                                                               |

We try to keep this README up to date but you may, from time to time, find other files or directories in this `.redwood` directory that have not yet been documented here. This is likely nothing to worry about but feel free to let us know and we'll update this list.

### Telemetry

RedwoodJS collects completely anonymous telemetry data about general usage. For transparency, that data is viewable in the respective directories and files. To learn more and manage your project's settings, visit [telemetry.redwoodjs.com](https://telemetry.redwoodjs.com).

### Have any questions?

Feel free to reach out to us in the [RedwoodJS Community](https://community.redwoodjs.com/) forum if you have any questions.
