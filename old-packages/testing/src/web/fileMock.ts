/**
 * configure Jest to gracefully handle asset files such as stylesheets and images.
 * Usually, these files aren't particularly useful in tests so we can safely mock them out.
 * See: https://jestjs.io/docs/en/webpack#handling-static-assets
 * See: https://github.com/redwoodjs/redwood/blob/4637f61d5e6aeb907d4a17217ab643cfb4d4ebe4/packages/testing/config/jest/web/jest-preset.js#L77-L78
 */
export default 'fileMock'
