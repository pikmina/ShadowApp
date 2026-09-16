import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
  }

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-destructive">Algo salió mal</h1>
            <p className="text-muted-foreground">La aplicación encontró un error inesperado.</p>
            <div className="bg-muted p-4 rounded text-left overflow-auto text-xs text-red-400 max-h-64">
              {this.state.error?.message}
            </div>
            <button 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
              onClick={() => window.location.reload()}
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
