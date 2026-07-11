// RWJS_ENV and RWJS_DEBUG_ENV
// are defined in Vite.config.js

// Note: These lines are useful during RSC/SSR development but will execute for all projects, even those without RSC/SSR
// console.log('config.ts')
// console.log('config.ts', RWJS_ENV)
// console.log('config.ts')

globalThis.RWJS_API_GRAPHQL_URL = RWJS_ENV.RWJS_API_GRAPHQL_URL
globalThis.RWJS_API_URL = RWJS_ENV.RWJS_API_URL
globalThis.__REDWOOD__APP_TITLE = RWJS_ENV.__REDWOOD__APP_TITLE
globalThis.RWJS_EXP_STREAMING_SSR = RWJS_ENV.RWJS_EXP_STREAMING_SSR
globalThis.RWJS_EXP_RSC = RWJS_ENV.RWJS_EXP_RSC
