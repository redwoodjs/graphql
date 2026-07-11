# Change Global To Global This

The legacy Node.js `global` object is still supported in Webpack for compatiblity reasons (src: https://webpack.js.org/api/module-variables/#global-nodejs), and there's a good chance that some projects are still using it because an old project of @Tobbe's was.

Since this isn't supported in Vite, we should codemod it, especially since it's as simple as a find and replace which jscodeshift already has support for.
