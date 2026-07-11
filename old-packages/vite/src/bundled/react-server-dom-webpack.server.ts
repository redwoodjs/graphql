// We bundle out these functions with the "react-server" condition
// so that we don't need to specify it at runtime.

export {
  decodeReply,
  decodeReplyFromBusboy,
} from 'react-server-dom-webpack/server'
