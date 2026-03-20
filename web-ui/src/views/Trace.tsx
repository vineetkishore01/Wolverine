import { useState, useMemo } from 'react';
import type { TraceEvent } from '../hooks/useWolverineSocket';
import { Filter, Trash2, Activity } from 'lucide-react';

/**
 * Properties for the TraceView component.
 */
interface TraceProps {
  /** Array of trace events to display in the live feed. */
  traces: TraceEvent[];
}

/**
 * TraceView component provides a real-time monitor of system events.
 */
export function TraceView({ traces: rawTraces }: TraceProps) {
  const [filter, setFilter] = useState<string | null>(null);
  const [clearedCount, setClearedCount] = useState(0);

  // We don't actually clear the parent state, just hide them locally for UX
  const traces = useMemo(() => {
    let result = rawTraces.slice(0, rawTraces.length - clearedCount);
    if (filter) {
      result = result.filter(t => t.type.toLowerCase() === filter.toLowerCase());
    }
    return result;
  }, [rawTraces, filter, clearedCount]);

  const eventTypes = useMemo(() => {
    const types = new Set(rawTraces.map(t => t.type.toLowerCase()));
    return Array.from(types);
  }, [rawTraces]);

  const getBorderColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'llm_in': return 'border-l-warning bg-warning/5';
      case 'llm_out': return 'border-l-info bg-info/5';
      case 'context': return 'border-l-dim bg-white/5';
      case 'action': return 'border-l-success bg-success/5';
      case 'error': return 'border-l-red-500 bg-red-500/5';
      default: return 'border-l-border bg-panel/30';
    }
  };

  const getTextColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'llm_in': return 'text-warning';
      case 'llm_out': return 'text-info';
      case 'action': return 'text-success';
      case 'error': return 'text-red-400';
      default: return 'text-dim';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg overflow-hidden">
      {/* Trace Toolbar */}
      <div className="h-14 border-b border-border px-6 flex items-center justify-between shrink-0 bg-bg/50 backdrop-blur-xl">
        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 text-accent-dim mr-2 shrink-0">
            <Filter size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filter</span>
          </div>
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${
              filter === null ? 'bg-accent text-bg' : 'text-dim hover:bg-panel'
            }`}
          >
            ALL EVENTS
          </button>
          {eventTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                filter === type ? 'bg-accent text-bg' : 'text-dim hover:bg-panel'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={() => setClearedCount(rawTraces.length)}
          className="ml-4 p-2 text-dim hover:text-red-400 transition-colors"
          title="Clear logs"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {traces.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-20 text-dim">
            <Activity size={32} className="opacity-20 mb-4" />
            <span className="text-sm">No trace events matching criteria.</span>
          </div>
        )}

        {traces.map((trace) => (
          <div
            key={trace.id}
            className={`border border-border/50 border-l-2 p-4 rounded-xl font-mono text-[11px] animate-[fadeIn_0.2s_ease-out] shadow-sm ${getBorderColor(trace.type)}`}
          >
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-3">
                <span className={`font-black uppercase tracking-widest ${getTextColor(trace.type)}`}>
                  {trace.type}
                </span>
                <span className="text-[10px] opacity-30 text-dim">|</span>
                <span className="text-accent-dim font-medium">{trace.source}</span>
              </div>
              <span className="text-[10px] text-dim opacity-50 tabular-nums">
                {new Date(trace.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div className="text-[#ccc] whitespace-pre-wrap leading-relaxed break-words bg-black/20 p-2 rounded-lg border border-white/5">
              {typeof trace.content === 'string' ? trace.content : JSON.stringify(trace.content, null, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}