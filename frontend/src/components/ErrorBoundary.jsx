import React from 'react';

/**
 * Global React Error Boundary for Parul Study Assistant.
 * Catches uncaught runtime errors in child components, logs forensic diagnostic info,
 * and displays a helpful, graceful recovery UI instead of rendering a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL: React ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      // Clear session keys to eliminate any corrupted local state
      localStorage.removeItem('study_assistant_active_session_id');
      localStorage.removeItem('study_assistant_active_session_capability');
      localStorage.removeItem('study_assistant_workspace_v2');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage during reset:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected rendering error occurred.';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 select-none font-sans">
          <div className="max-w-xl w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
            {/* Header / Brand */}
            <div className="flex items-center gap-3 mb-6 border-b border-slate-700/60 pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-sm text-white shadow-md">
                PU
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Parul Study Assistant</h1>
                <p className="text-xs text-slate-400">Academic Exam Intelligence & Syllabus Analysis</p>
              </div>
            </div>

            {/* Error Notification */}
            <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <h2 className="text-sm font-semibold text-rose-200">Interface Recovery Mode</h2>
                  <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                    A component encountered a runtime exception during display. Your saved study files and session history remain safe.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Reload Application</span>
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs transition-colors border border-slate-600 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>Reset to Clean Session</span>
              </button>
            </div>

            {/* Collapsible Diagnostics */}
            <details className="group border border-slate-700/60 rounded-xl bg-slate-900/60 text-xs overflow-hidden">
              <summary className="px-4 py-2.5 text-slate-400 hover:text-slate-200 font-mono text-[11px] cursor-pointer flex items-center justify-between select-none">
                <span>View Forensic Diagnostic Details</span>
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-1 font-mono text-[11px] text-slate-300 space-y-2 border-t border-slate-800">
                <div className="text-rose-400 break-words font-semibold">
                  {errorMessage}
                </div>
                {componentStack && (
                  <pre className="text-slate-400 overflow-x-auto p-2 bg-black/40 rounded border border-slate-800 max-h-48 text-[10px] leading-tight whitespace-pre-wrap">
                    {componentStack.trim()}
                  </pre>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
