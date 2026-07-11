import React from 'react'

// @NOTE: Helmet is not used in SSR & RSC
import * as helmetPkg from 'react-helmet-async'
const { Helmet, HelmetProvider } = helmetPkg

interface RedwoodProviderProps {
  children: React.ReactNode
  titleTemplate?: string
}

export const RedwoodProvider = ({
  children,
  titleTemplate,
}: RedwoodProviderProps) => {
  const appTitle = globalThis.__REDWOOD__APP_TITLE
  const template = () => {
    if (titleTemplate) {
      let template = titleTemplate.replace(/%AppTitle/g, appTitle)
      template = template.replace(/%PageTitle/g, '%s')
      return template
    }
    return ''
  }

  if (RWJS_ENV.RWJS_EXP_STREAMING_SSR) {
    return <>{children}</>
  }

  return (
    <HelmetProvider context={globalThis.__REDWOOD__HELMET_CONTEXT}>
      <Helmet titleTemplate={template()} defaultTitle={appTitle}>
        <title>{appTitle}</title>
      </Helmet>
      {children}
    </HelmetProvider>
  )
}

declare global {}
