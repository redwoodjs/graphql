// For some reason, testutils types aren't exported.... I just dont...
// Partially copied from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/jscodeshift/src/testUtils.d.ts
declare module 'jscodeshift/dist/testUtils' {
  import type { Transform, Options, Parser } from 'jscodeshift'
  function defineTest(
    dirName: string,
    transformName: string,
    options?: Options | null,
    testFilePrefix?: string | null,
    testOptions?: {
      parser: 'ts' | 'tsx' | 'js' | 'jsx' | Parser
    },
  ): () => any

  function defineInlineTest(
    module: Transform,
    options: Options,
    inputSource: string,
    expectedOutputSource: string,
    testName?: string,
  ): () => any

  function runInlineTest(
    module: Transform,
    options: Options,
    input: {
      path?: string
      source: string
    },
    expectedOutput: string,
    testOptions?: TestOptions,
  ): string
}

// @NOTE: Redefining types, because they get lost when importing from the testUtils file
type MatchTransformSnapshotFunction = (
  transformName: string,
  fixtureName?: string,
  parser?: 'ts' | 'tsx',
) => Promise<void>

type MatchFolderTransformFunction = (
  transformFunctionOrName: (() => any) | string,
  fixtureName: string,
  options?: {
    removeWhitespace?: boolean
    targetPathsGlob?: string
    /**
     * Use this option, when you want to run a codemod that uses jscodeshift
     * as well as modifies file names. e.g. convertJsToJsx
     */
    useJsCodeshift?: boolean
  },
) => Promise<void>

type MatchInlineTransformSnapshotFunction = (
  transformName: string,
  fixtureCode: string,
  expectedCode: string,
  parser: 'ts' | 'tsx' | 'babel' = 'tsx',
) => Promise<void>

// These files gets loaded in jest setup, so becomes available globally in tests
declare global {
  const matchTransformSnapshot: MatchTransformSnapshotFunction
  const matchInlineTransformSnapshot: MatchInlineTransformSnapshotFunction
  const matchFolderTransform: MatchFolderTransformFunction
  namespace jest {
    interface Matchers<R> {
      toMatchFileContents(
        fixturePath: string,
        { removeWhitespace }: { removeWhitespace: boolean },
      ): R
    }
  }
}

export {}
