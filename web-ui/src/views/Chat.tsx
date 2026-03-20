import { useState, useRef, useEffect, useCallback } from 'react';
import type { Message } from '../hooks/useWolverineSocket';
import { Trash2, Send, Wand2 } from 'lucide-react';

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
 * Features a scrollable message list and an auto-expanding multiline input.
 */
export function ChatView({ messages, onSendMessage, onClear }: ChatProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Adjust textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
      // Reset height
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg relative">
      {/* Header Actions */}
      <div className="absolute top-4 right-6 z-30 flex gap-2">
        {messages.length > 0 && onClear && (
          <button
            onClick={onClear}
            title="Clear conversation"
            className="p-2 rounded-lg bg-panel border border-border text-dim hover:text-red-400 hover:border-red-400/30 transition-all shadow-xl backdrop-blur-md"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center mt-24 text-center space-y-4 animate-[fadeIn_0.5s_ease-out]">
              <div className="w-16 h-16 rounded-3xl bg-panel border border-border flex items-center justify-center shadow-2xl">
                <Wand2 className="text-accent opacity-50" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight">Wolverine Protocol</h3>
                <p className="text-dim text-sm max-w-[280px]">Autonomous intelligence initialized. Awaiting commands.</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.source === 'user' ? 'items-end' : 'items-start'} animate-[fadeIn_0.3s_ease-out]`}
            >
              <div
                className={`max-w-[90%] px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                  msg.source === 'user'
                    ? 'bg-white text-black font-medium rounded-tr-sm'
                    : 'bg-panel border border-border text-text rounded-tl-sm'
                }`}
              >
                {msg.isThinking ? (
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-info animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-info animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-info animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-info text-xs font-mono uppercase tracking-widest opacity-80">{msg.content}</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                )}
              </div>
              <span className="text-[9px] text-accent-dim mt-1.5 px-1 uppercase tracking-tighter opacity-50">
                {msg.source === 'user' ? 'Operator' : 'Wolverine'}
              </span>
            </div>
          ))}
          <div ref={endRef} className="h-4" />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-bg via-bg/95 to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
          <div className="glass p-2 rounded-2xl flex items-end gap-2 shadow-2xl border-white/5 ring-1 ring-white/5">
            <textarea
              ref={textareaRef}
              rows={1}
              className="flex-1 bg-transparent border-none text-text px-4 py-3 outline-none text-[14px] placeholder:text-accent-dim resize-none min-h-[44px] max-h-[200px]"
              placeholder="Deploy directive..."
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="h-11 w-11 flex items-center justify-center bg-white text-black rounded-xl hover:bg-zinc-200 transition-all active:scale-90 disabled:opacity-20 disabled:grayscale disabled:hover:bg-white"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-3 text-center text-[9px] text-accent-dim tracking-[0.2em] uppercase opacity-30">
            Secure Neural Link Established
          </div>
        </div>
      </div>
    </div>
  );
}