import type { TraceEvent } from '../hooks/useWolverineSocket';

/**
 * Properties for the TraceView component.
 */
interface TraceProps {
  /** Array of trace events to display in the live feed. */
  traces: TraceEvent[];
}

/**
 * TraceView component provides a real-time monitor of system events,
 * including LLM interactions, context retrievals, and agent actions.
 * 
 * @param props - Component properties containing the trace history.
 * @returns A JSX element representing the trace monitor.
 */
export function TraceView({ traces }: TraceProps) {
  /**
   * Determines the border color based on the trace event type.
   * 
   * @param type - The type of the trace event.
   * @returns A Tailwind CSS border color class.
   */
  const getBorderColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'llm_in': return 'border-l-warning';
      case 'llm_out': return 'border-l-info';
      case 'context': return 'border-l-[#444]';
      case 'action': return 'border-l-success';
      default: return 'border-l-border';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2 bg-bg h-full">
      {traces.map((trace) => (
        <div
          key={trace.id}
          className={`bg-[#050505] border border-[#111] border-l-2 p-3 rounded-md font-mono text-xs ${getBorderColor(trace.type)}`}
        >
          <div className="text-dim mb-1.5 flex justify-between text-[10px]">
            <span>{new Date(trace.timestamp).toLocaleTimeString()} | {trace.source}</span>
            <span className="uppercase">{trace.type}</span>
          </div>
          <div className="text-[#aaa] whitespace-pre-wrap leading-relaxed">
            {typeof trace.content === 'string' ? trace.content : JSON.stringify(trace.content, null, 2)}
          </div>
        </div>
      ))}
      {traces.length === 0 && (
        <div className="text-dim text-center mt-10 text-sm">No trace events recorded yet.</div>
      )}
    </div>
  );
}