// Unindent the provided (maybe multiline) string such that the first line has an indent of 0
// and all subsequent lines maintain their relative indentation level to the first line.
export const unindented = (code) => {
  const firstLineIndent = code.length - code.trimLeft().length
  return code.replace(new RegExp(`^( {${firstLineIndent}})`, 'gm'), '')
}
