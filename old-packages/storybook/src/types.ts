import type docgenTypescript from '@joshwooding/vite-plugin-react-docgen-typescript'
import type {
  StorybookConfigVite,
  BuilderOptions,
} from '@storybook/builder-vite'
import type {
  StorybookConfig as StorybookConfigBase,
  TypescriptOptions as TypescriptOptionsBase,
} from '@storybook/types'

type FrameworkName = 'storybook-framework-redwoodjs-vite'
type BuilderName = '@storybook/builder-vite'

export type FrameworkOptions = {
  builder?: BuilderOptions
  strictMode?: boolean
  /**
   * Use React's legacy root API to mount components
   * @description
   * React has introduced a new root API with React 18.x to enable a whole set of new features (e.g. concurrent features)
   * If this flag is true, the legacy Root API is used to mount components to make it easier to migrate step by step to React 18.
   * @default false
   */
  legacyRootApi?: boolean
}

type StorybookConfigFramework = {
  framework:
    | FrameworkName
    | {
        name: FrameworkName
        options: FrameworkOptions
      }
  core?: StorybookConfigBase['core'] & {
    builder?:
      | BuilderName
      | {
          name: BuilderName
          options: BuilderOptions
        }
  }
}

type TypescriptOptions = TypescriptOptionsBase & {
  /**
   * Sets the type of Docgen when working with React and TypeScript
   *
   * @default `'react-docgen'`
   */
  reactDocgen: 'react-docgen-typescript' | 'react-docgen' | false
  /**
   * Configures `@joshwooding/vite-plugin-react-docgen-typescript`
   */
  reactDocgenTypescriptOptions: Parameters<typeof docgenTypescript>[0]
}

/**
 * The interface for Storybook configuration in `main.ts` files.
 */
export type StorybookConfig = Omit<
  StorybookConfigBase,
  keyof StorybookConfigVite | keyof StorybookConfigFramework | 'typescript'
> &
  StorybookConfigVite &
  StorybookConfigFramework & {
    typescript?: Partial<TypescriptOptions>
  }
