// TODO: This file should be deduplicated across the framework
// when we take the time to make architectural changes.

import chalk from 'chalk'

export default {
  error: chalk.bold.red,
  warning: chalk.hex('#ffa500'),
  highlight: chalk.hex('#ffa500'),
  success: chalk.green,
  info: chalk.grey,
  bold: chalk.bold,
  underline: chalk.underline,
  note: chalk.blue,
  tip: chalk.green,
  important: chalk.magenta,
  caution: chalk.red,
  link: chalk.hex('#e8e8e8'),
}
