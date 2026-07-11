import type { TagDescriptor } from '@redwoodjs/web'

import App from './App'
import { Document } from './Document'
import Routes from './Routes'

interface Props {
  css: string[]
  meta?: TagDescriptor[]
}

export const ServerEntry: React.FC<Props> = ({ css, meta }) => {
  return (
    <Document css={css} meta={meta}>
      <App>
        <Routes />
      </App>
    </Document>
  )
}
