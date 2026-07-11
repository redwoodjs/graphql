# LogFormatter

LogFormatter is a utility that formats RedwoodJS Logger output in development.

It is based on [pino-colada](https://github.com/lrlna/pino-colada/blob/master/README.md): a cute [ndjson](http://ndjson.org) formatter for [pino](https://github.com/pinojs/pino).

Redwood-specific GraphQL log data included by the the `useRedwoodLogger` envelop plug-in is supported:

- Request Id
- User-Agent
- GraphQL Operation Name
- GraphQL Query
- GraphQL Data

## Command

Pipe logs to the formatter:

Example:

```bash
echo "{\"level\": 30, \"message\": \"Hello RedwoodJS\"}" | yarn rw-log-formatter
```

Output:

```terminal
11:00:28 🌲 Hello RedwoodJS
✨  Done in 0.14s.
```

## Usage

Log formatting is automatically setup in the `yarn rw dev` command.

Pipe logs to the formatter with `rw serve`:

```bash
yarn rw dev
yarn rw serve | yarn rw-log-formatter
yarn rw serve api | yarn rw-log-formatter
```

Note: Since `rw serve` sets the Node environment to `production` you will not see log non-warn/error output unless you configure your logging level to `debug` or below.
