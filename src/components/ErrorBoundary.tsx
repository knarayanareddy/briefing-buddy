import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Top-level error boundary: a render-time crash shows a recoverable screen
 * instead of a white page. Without this, one bad component render unmounts
 * the whole React tree with no feedback.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Unhandled render error:", error, info.componentStack ?? "");
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen bg-[#0A0C10] text-[#E0E2E6] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="w-16 h-16 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-widest mb-2">System Hiccup</h1>
            <p className="text-white/50 text-sm">
              The briefing hit an unexpected error and stopped rendering.
              Your data is safe — reload to continue.
            </p>
            <p className="text-white/30 text-[11px] font-mono mt-3 break-all">{error.message}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs uppercase tracking-widest font-bold transition-all"
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="px-5 py-3 bg-[#5789FF]/10 hover:bg-[#5789FF]/20 border border-[#5789FF]/30 rounded-xl text-xs uppercase tracking-widest font-bold text-[#5789FF] transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
