import tsEslintParser from '@typescript-eslint/parser'
import { RuleTester } from '@typescript-eslint/rule-tester'

import { unsupportedRouteComponents } from '../unsupported-route-components.js'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsEslintParser,
    parserOptions: {
      ecmaVersion: 'latest',
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
})

ruleTester.run('unsupported-route-components', unsupportedRouteComponents, {
  valid: [
    {
      code: 'const Routes = () => <Router></Router>',
    },
    {
      code: 'const Routes = () => <Router><Route path="/" page={HomePage} name="home" /></Router>',
    },
    {
      code: 'const Routes = () => <Router><Set><Route path="/contacts" page={ContactsPage} name="contacts" /></Set></Router>',
    },
    {
      code: 'const Routes = () => <Router><Private><Route path="/contacts" page={ContactsPage} name="contacts" /></Private></Router>',
    },
    {
      code: `
        const Routes = () => {
          return (
            <Router>
              <Set>
                <Route path="/contacts" page={ContactsPage} name="contacts" />
              </Set>
            </Router>
          )
        }`.replace(/ +/g, ' '),
    },
    {
      code: `
        const AnotherThing = <Bazinga><p>Hello</p></Bazinga>
        const Routes = () => {
          return (
            <Router>
              <PrivateSet whileLoadingAuth={AnotherThing}>
                <Route path="/contacts" page={ContactsPage} name="contacts" />
              </PrivateSet>
            </Router>
          )
        }`.replace(/ +/g, ' '),
    },
  ],
  invalid: [
    {
      code: 'const Routes = () => <Router><div><Route path="/" page={HomePage} name="home" /></div></Router>',
      errors: [{ messageId: 'unexpected' }],
    },
    // block statement style
    {
      code: 'const Routes = () => { return (<Router><div><Route path="/" page={HomePage} name="home" /></div></Router>) }',
      errors: [{ messageId: 'unexpected' }],
    },
    {
      code: `
        const Routes = () => {
          return (
            <Router>
              <Set>
                <CustomElement>
                  <Route path="/contacts" page={ContactsPage} name="contacts" />
                </CustomElement>
              </Set>
            </Router>
          )
        }`.replace(/ +/g, ' '),
      errors: [{ messageId: 'unexpected' }],
    },
  ],
})
