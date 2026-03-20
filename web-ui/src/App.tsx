import { useState, Component, ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './views/Chat';
import { TraceView } from './views/Trace';
import { SettingsView } from './views/Settings';
import { useWolverineSocket } from './hooks/useWolverineSocket';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[React Error Boundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-bg text-text">
          <div className="text-center max-w-md p-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2 text-red-400">Component Error</h2>
            <p className="text-sm text-dim mb-4">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-panel border border-border rounded-lg text-sm hover:bg-panel/80 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const { status, messages, traces, sendMessage, clearMessages } = useWolverineSocket();

  return (
    <ErrorBoundary>
      <div className="flex h-full w-full bg-bg text-text">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <main className="flex-1 flex flex-col relative bg-bg">
          <header className="h-[56px] border-b border-border flex items-center justify-between px-6 bg-bg/60 backdrop-blur-xl z-40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent opacity-20"></div>
              <div className="font-bold tracking-tight text-[13px] uppercase text-accent-dim">Mission Control</div>
            </div>
            <div className="flex items-center gap-2.5 bg-panel border border-border px-3 py-1 rounded-full text-[10px] font-medium tracking-wide">
              <div className={`w-1.5 h-1.5 rounded-full ${
                status === 'connected' ? 'bg-success' : 
                status === 'connecting' ? 'bg-warning animate-pulse' : 'bg-red-500'
              }`} />
              <span className="text-dim">
                {status === 'connected' ? 'SYSTEM ONLINE' : 
                 status === 'connecting' ? 'ESTABLISHING LINK...' : 'LINK SEVERED'}
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <ErrorBoundary>
              {activeTab === 'chat' && <ChatView messages={messages} onSendMessage={sendMessage} onClear={clearMessages} />}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeTab === 'trace' && <TraceView traces={traces} />}
            </ErrorBoundary>
            <ErrorBoundary>
              {activeTab === 'settings' && <SettingsView />}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;