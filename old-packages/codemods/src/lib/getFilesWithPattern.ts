/**
 * Uses ripgrep to search files for a pattern,
 * returning the name of the files that contain the pattern.
 *
 * @see {@link https://github.com/burntsushi/ripgrep}
 */
import { rgPath } from '@vscode/ripgrep'
import execa from 'execa'

const getFilesWithPattern = ({
  pattern,
  filesToSearch,
}: {
  pattern: string
  filesToSearch: string[]
}) => {
  try {
    const { stdout } = execa.sync(rgPath, [
      '--files-with-matches',
      pattern,
      ...filesToSearch,
    ])

    /**
     * Return an array of files that contain the pattern
     */
    return stdout.toString().split('\n')
  } catch {
    return []
  }
}

export default getFilesWithPattern
