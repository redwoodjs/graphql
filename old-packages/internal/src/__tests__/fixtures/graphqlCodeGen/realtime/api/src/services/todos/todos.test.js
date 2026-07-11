import dog from 'src/lib/dog'

jest.mock('src/lib/dog', () => {
  return {
    mockedModule: true
  }
})

test('should always pass', () => {
  expect(dog.mockedModule).toBe(true)
})
