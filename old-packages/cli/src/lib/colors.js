import chalk from 'chalk'

/**
 * To keep a consistent color/style palette between cli packages, such as
 * @redwood/cli and @redwood/create-redwood-app, please keep them compatible
 * with one and another. We'll might split up and refactor these into a
 * separate package when there is a strong motivation behind it.
 *
 * Current files:
 *
 * - packages/cli/src/lib/colors.js (this file)
 * - packages/create-redwood-app/src/create-redwood-app.js
 */
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
  link: chalk.underline,
}
