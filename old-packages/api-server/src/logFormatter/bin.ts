import split from 'split2'

import { LogFormatter } from './index'

const input = process.stdin
const output = process.stdout

input.pipe(split(LogFormatter())).pipe(output)

// assume that receiving a SIGINT (Ctrl-C) is a normal event, so don't exit with
// a 129 error code, which makes execa blow up. Just return a nice quiet 0.
process.on('SIGINT', () => {
  process.exit(0)
})
