import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * EngineBoundary — isolates a feature "micro-engine" so its crash never
 * takes down the surrounding UI (feed, player, shell, etc).
 *
 * Every non-critical module (ads, comments, analytics, notifications,
 * moderation UI, uploads) should be wrapped in one of these. If the child
 * throws during render/lifecycle, we render `fallback` (or nothing) and
 * the rest of the app keeps running.
 */
type Props = {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
  /** If true, hide the failed slot entirely instead of showing fallback. */
  silent?: boolean;
};
type State = { hasError: boolean };

export class EngineBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Fire-and-forget: never let the logger itself throw.
    try {
      // eslint-disable-next-line no-console
      console.warn(`[engine:${this.props.name}] isolated crash`, error, info.componentStack);
    } catch {
      /* noop */
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.silent) return null;
      return (
        this.props.fallback ?? (
          <div className="text-[11px] text-muted-foreground/70 italic px-3 py-2">
            {this.props.name} unavailable
          </div>
        )
      );
    }
    return this.props.children;
  }
}
