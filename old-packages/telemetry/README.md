# Telemetry

RedwoodJS collects completely anonymous telemetry data about general usage.

Here is an example JSON packet containing the telemetry data for running yarn rw info:

```json
{
  "type": "command",
  "command": "info", // actual CLI command that was invoked, including flags
  "ci": false, // whether or not this is running in a CI environment
  "duration": 2353, // how long the process took, in milliseconds
  "NODE_ENV": "development", // the value of NODE_ENV, if set
  "complexity": "4.2.6.3", // a measure of how complex the app is (route, service, cell and page counts)
  "system": "8.32", // cpu core count, memory in GB
  "sides": "web,api", // sides that are in use
  "shell": "zsh",
  "nodeVersion": "14.17.1",
  "yarnVersion": "14.17.1",
  "npmVersion": "14.17.1",
  "vsCodeVersion": "1.58.0",
  "redwoodVersion": "0.35.1",
  "os": "macOS",
  "osVersion": "11.4",
  "system": "8.32" // number of cpu cores and system memory
}
```

## How do I turn it off?

Set an environment variable, either in your app's .env file, or anywhere that creates variables for your user space, like `.bashrc` or `.bash_profile`:

```terminal
REDWOOD_DISABLE_TELEMETRY=1
```

## About

See: https://telemetry.redwoodjs.com

## Troubleshooting

If you suspect problems with telemetry when running CRWA, you can set the verbose flag to help diagnose issues.

For example,

```terminal
REDWOOD_VERBOSE_TELEMETRY=true yarn create-redwood-app bazinga
```
