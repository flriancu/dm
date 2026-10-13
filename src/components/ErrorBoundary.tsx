import { Component, type ReactNode } from 'react'

interface Props {
  /** A change of this value clears the error (e.g. the route, so leaving the broken page recovers). */
  resetKey?: unknown
  fallback: (error: unknown) => ReactNode
  children: ReactNode
}

/** Catches a render error below it and shows `fallback` instead of an empty page. */
export default class ErrorBoundary extends Component<Props, { error: unknown; key: unknown }> {
  state = { error: null as unknown, key: this.props.resetKey }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  static getDerivedStateFromProps(props: Props, state: { error: unknown; key: unknown }) {
    return props.resetKey !== state.key ? { error: null, key: props.resetKey } : null
  }

  componentDidCatch(error: unknown) {
    console.error(error)
  }

  render() {
    const { error } = this.state
    return error ? this.props.fallback(error) : this.props.children
  }
}
