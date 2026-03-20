import { useState, useRef, useEffect } from 'react';
import type { Message } from '../hooks/useWolverineSocket';

/**
 * Properties for the ChatView component.
 */
interface ChatProps {
  /** Array of messages to display in the chat window. */
  messages: Message[];
  /** Callback function triggered when the user sends a message. */
  onSendMessage: (msg: string) => void;
  /** Optional callback to clear the chat history. */
  onClear?: () => void;
}

/**
 * ChatView component provides the main conversational interface.
 * Features a scrollable message list and a fixed message input area.
 * 
 * @param props - Component properties including messages and event handlers.
 * @returns A JSX element representing the chat view.
 */
export function ChatView({ messages, onSendMessage, onClear }: ChatProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg">
      {messages.length > 0 && onClear && (
        <button
          onClick={onClear}
          className="absolute top-4 right-4 text-[10px] text-accent-dim hover:text-accent transition-colors z-10"
        >
          Clear Chat
        </button>
      )}
      <div className="flex-1 overflow-y-auto px-6 py-8 pb-24 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center text-accent-dim text-sm mt-20">
            Start a conversation with Wolverine...
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] px-5 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm transition-all duration-300 ${
              msg.source === 'user'
                ? 'self-end bg-accent text-bg font-medium rounded-tr-none'
                : 'self-start bg-panel border border-border text-text rounded-tl-none'
            }`}
          >
            {msg.isThinking ? (
              <span className="text-info text-[12px] italic flex items-center gap-2 thinking-dots">
                {msg.content}
              </span>
            ) : (
              <div className="whitespace-pre-wrap">{msg.content}</div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="shrink-0 px-6 py-4 bg-bg/80 backdrop-blur-xl border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="glass p-1.5 rounded-2xl flex gap-2 shadow-2xl">
            <input
              type="text"
              className="flex-1 bg-transparent border-none text-text px-4 py-3 outline-none text-[14px] placeholder:text-accent-dim"
              placeholder="Command Wolverine..."
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-accent text-bg border-none px-5 rounded-xl font-bold text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}