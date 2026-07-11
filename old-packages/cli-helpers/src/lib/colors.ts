import chalk from 'chalk'

/**
 * To keep a consistent color/style palette between cli packages, such as
 * @redwood/cli and @redwood/create-redwood-app, please only use the colors
 * defined here. If you *really* can't find a color that fits your needs,
 * it's better to add it here than to introduce a new one-off color in whatever
 * package you're going to use it in.
 */
export const colors = {
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
