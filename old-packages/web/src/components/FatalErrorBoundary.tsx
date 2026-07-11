import React from 'react'

type PropsInfallibleErrorBoundary = Partial<{
  children: React.ReactNode
}>

type State = {
  hasError: boolean
  error?: Error
}

class InfallibleErrorBoundary extends React.Component<
  PropsInfallibleErrorBoundary,
  State
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong and we are unable to show this page.</h1>
    }

    return this.props.children
  }
}

type PropsFatalErrorBoundary = {
  children?: React.ReactNode
  page: React.ComponentType<{ error?: Error }>
}

class FatalErrorBoundary extends React.Component<
  PropsFatalErrorBoundary,
  State
> {
  state = { hasError: false, error: undefined }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    const { page: Page } = this.props
    if (this.state.hasError) {
      return (
        <InfallibleErrorBoundary>
          <Page error={this.state.error} />
        </InfallibleErrorBoundary>
      )
    }

    return this.props.children
  }
}

export { FatalErrorBoundary }
