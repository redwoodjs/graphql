// When you've added props to your component,
// pass Storybook's `args` through this story to control it from the addons panel:
//
// ```jsx
// export const generated = (args) => {
//   return <TestComponent {...args} />
// }
// ```
//
// See https://storybook.js.org/docs/7/writing-stories/args

import TestComponent from './TestComponent'

export const generated = () => {
  return <TestComponent />
}

export default {
  title: 'Components/TestComponent',
  component: TestComponent,
}
