import { requestInfo } from "rwsdk/worker";

import appStylesHref from "./index.css?url";
import scaffoldStylesHref from "./scaffold.css?url";

const clientEntryHref = import.meta.env.DEV ? "/src/client.tsx" : "rwsdk_asset:/src/client.tsx";

export const Document: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Redwood test project on RWSdk</title>
      <link rel="stylesheet" href={appStylesHref} precedence="first" />
      <link rel="stylesheet" href={scaffoldStylesHref} precedence="first" />
      <link rel="modulepreload" href={clientEntryHref} as="script" />
    </head>
    <body>
      {children}
      <script nonce={requestInfo.rw.nonce}>{`import("${clientEntryHref}")`}</script>
    </body>
  </html>
);
