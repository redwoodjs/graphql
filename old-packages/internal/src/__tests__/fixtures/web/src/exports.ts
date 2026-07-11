export { exportA, exportB } from './anotherModule.'

export const myVariableExport = gql`query Q { node { field } }`

export const myArrowFunctionExport = () => {
  return <>Hello</>
}

export function myFunctionExport() {}

export class MyClassExport {}

export interface Bazinga {
  boolean: true
}
