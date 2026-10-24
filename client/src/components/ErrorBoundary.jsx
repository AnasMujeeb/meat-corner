import { Component } from "react";

/**
 * ErrorBoundary
 * Catches JavaScript errors anywhere in the child component tree and renders
 * a graceful fallback instead of an unmounted white screen.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong.</p>}>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console for debugging; replace with a real error reporting
    // service (e.g. Sentry) in production.
    console.error("[ErrorBoundary] Caught error:", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Allow the parent to supply a custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: "40vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
            textAlign: "center",
            background: "var(--paper, #f7f3ee)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-heading, monospace)",
              fontSize: 13,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted, #888)",
              marginBottom: 20,
            }}
          >
            Something went wrong loading this section.
          </p>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            RELOAD PAGE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
