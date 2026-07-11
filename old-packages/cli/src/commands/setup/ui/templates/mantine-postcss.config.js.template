/**
 * `postcss-preset-mantine` includes the following PostCSS plugins:
 * - postcss-nested
 * - postcss-mixins with Mantine specific mixins
 * - Custom plugin with em/rem functions
 * Read more: https://mantine.dev/styles/postcss-preset/

 * `postcss-simple-vars` enables use of SCSS-like variables inside CSS files:
 * ```postcss
 * $blue    : #056ef0;
 * $width-sm: rem(37.5);
 * $selector: .my-component
 *
 * @media (min-width: $width-sm) {
 *   $selector {
 *     background: $blue;
 *   }
 * }
 * ```
 * Read more: https://github.com/postcss/postcss-simple-vars
*/
module.exports = {
  plugins: [
    require('postcss-preset-mantine'),
    require('postcss-simple-vars')({
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    }),
  ],
}
