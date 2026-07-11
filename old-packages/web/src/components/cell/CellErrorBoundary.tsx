'use client'

import React from 'react'

import type { CellFailureProps } from './cellTypes.js'

export type FallbackProps = {
  error: QueryOperationResult['error']
  resetErrorBoundary: () => void
}

export type CellErrorBoundaryProps = {
  // Note that the fallback has to be an FC, not a Node
  // because the error comes from this component's state
  renderFallback: (
    fbProps: FallbackProps,
  ) => React.ReactElement<CellFailureProps>
  children: React.ReactNode
}

interface ErrState {
  hasError: boolean
  error?: QueryOperationResult['error']
}

export class CellErrorBoundary extends React.Component<
  CellErrorBoundaryProps,
  ErrState
> {
  constructor(props: CellErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // @TODO do something with this?
    console.log('Cell failure: ', {
      error,
      errorInfo,
    })
  }

  render() {
    // The fallback is constructed with all the props required, except error and errorCode
    // in createSuspendingCell.tsx
    const { renderFallback } = this.props

    if (this.state.hasError) {
      return renderFallback({
        error: this.state.error,
        resetErrorBoundary: () => {
          this.setState({ hasError: false, error: undefined })
        },
      })
    }

    return this.props.children
  }
}
