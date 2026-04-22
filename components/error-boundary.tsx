'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in Module ${this.props.moduleName || 'Unknown'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 flex flex-col items-center justify-center text-center gap-4 my-10 break-inside-avoid">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <div className="flex flex-col gap-1">
            <h4 className="text-[14px] font-black uppercase text-red-600 tracking-widest">Modul-Fehler</h4>
            <p className="text-[12px] text-red-500/80 font-bold uppercase tracking-wider">
              {this.props.moduleName || 'Komponente'} konnte nicht geladen werden.
            </p>
          </div>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Modul neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
