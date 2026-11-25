import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getFirebaseUpgradeLink } from '../../firebase';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
  isFreeDailyQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  declare props: Readonly<ErrorBoundaryProps>;
  declare setState: (state: Partial<ErrorBoundaryState>) => void;
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    isQuotaError: false,
    isFreeDailyQuotaError: false,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'An unexpected application error occurred.';
    let readable = raw;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.error === 'string') {
        readable = parsed.error;
      }
    } catch {
      // Non-JSON error message
    }
    const lower = readable.toLowerCase();
    return {
      hasError: true,
      errorMessage: readable,
      isQuotaError: lower.includes('quota exceeded'),
      isFreeDailyQuotaError: readable.includes("Free daily read units per project (free tier database)"),
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('AutoCraft Pro ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
      isFreeDailyQuotaError: false,
    });
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6 font-sans text-[#0F172A]">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="bg-[#0F3D5E] text-white px-6 py-4 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-300" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">AutoCraft Pro — Service Interrupted</h2>
                <p className="text-[11px] text-sky-200">Data synchronization encountered an error</p>
              </div>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#0F172A] leading-relaxed bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-800 break-words">
                {this.state.errorMessage}
              </p>

              {this.state.isQuotaError && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
                  <p className="font-bold">Daily Free-Tier Quota Reached</p>
                  <p>
                    The free-tier database quota resets the next day. Details are listed under the Spark plan column for Firestore Enterprise edition.
                  </p>
                  {this.state.isFreeDailyQuotaError && (
                    <a
                      href={getFirebaseUpgradeLink()}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block font-bold text-[#0284C7] underline"
                    >
                      Open Firestore Database Upgrade Options
                    </a>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold flex items-center justify-center space-x-2 transition shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload AutoCraft Pro</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
