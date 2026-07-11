import fg from 'fast-glob'

export const findCellMocks = (webBasePath: string) => {
  // Cell mocks are only next to Cells, inside the folder
  return fg.sync('**/*Cell/*.mock.{js,ts,jsx,tsx}', {
    cwd: webBasePath,
    ignore: ['node_modules'],
    absolute: true,
  })
}
