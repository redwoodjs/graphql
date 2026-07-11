import task from 'tasuku'

import addApiAliasToTsConfig from './tsconfigForRouteHooks'

export const command = 'tsconfig-for-route-hooks'
export const description =
  '(v2.3.x->v2.3.x) Allow $api imports in *.routesHooks.ts files'

export const handler = () => {
  // @ts-expect-error ignore, old codemod
  task('Tsconfig For Route Hooks', async ({ setOutput }: task.TaskInnerApi) => {
    addApiAliasToTsConfig()
    setOutput('All done! Run `yarn rw lint --fix` to prettify your code')
  })
}
