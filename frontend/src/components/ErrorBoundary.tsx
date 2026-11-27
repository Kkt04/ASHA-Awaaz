import React, { Component, ErrorInfo, ReactNode } from 'react';
import { HeartPulse, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isClearingCache: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    isClearingCache: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, isClearingCache: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ASHA Awaaz Uncaught Application Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = async () => {
    this.setState({ isClearingCache: true });
    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      // 2. Clear caches
      if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
          await caches.delete(key);
        }
      }
    } catch (e) {
      console.warn('Cache clearing notice:', e);
    }
    // Hard reload with cache busting
    window.location.href = window.location.origin + '?cacheBust=' + Date.now();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FBFBFA] dark:bg-[#121212] text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none">
          <div className="max-w-md w-full bg-white dark:bg-[#1E1E1E] border border-emerald-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
            {/* Logo Badge */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mx-auto shadow-sm">
              <HeartPulse className="w-9 h-9 stroke-[2.5]" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                ASHA Awaaz
              </h1>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Display Recovery Mode</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium pt-1">
                A screen display issue occurred while loading. Your stored patient visits and offline registers are safe and untouched.
              </p>
            </div>

            {/* Offline Safe Note */}
            <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-300 flex items-center space-x-2 text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Offline IndexedDB database is secure.</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-sm text-white bg-[#2E7D32] hover:bg-[#1B5E20] active:scale-95 shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 transition-all touch-target"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <button
                type="button"
                disabled={this.state.isClearingCache}
                onClick={this.handleClearCacheAndReload}
                className="w-full py-3 px-5 rounded-2xl font-bold text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all touch-target"
              >
                {this.state.isClearingCache ? 'Refreshing Cache...' : 'Reset Offline Cache & Reload'}
              </button>
            </div>

            {/* Error Details for Troubleshooting */}
            {this.state.error && (
              <details className="text-left pt-2 text-[11px] text-gray-400 dark:text-gray-500">
                <summary className="cursor-pointer font-semibold hover:text-gray-600 dark:hover:text-gray-400">
                  Diagnostic Information
                </summary>
                <div className="mt-2 p-2.5 bg-gray-50 dark:bg-black/40 rounded-xl overflow-x-auto font-mono text-[10px] text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
