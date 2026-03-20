import { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * SettingsView component allows users to view and modify Wolverine's system configuration.
 * Config is divided into three sections: Intelligence (LLM), Senses (Channels), and Soul (Memory).
 */
export function SettingsView() {
  const [activeSection, setActiveSection] = useState('brain');
  const [config, setConfig] = useState<any>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [ollamaStatus, setOllamaStatus] = useState<'unchecked' | 'checking' | 'ok' | 'fail'>('unchecked');

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Failed to fetch config", err));
  }, []);

  /**
   * Persists the current configuration state to the backend.
   */
  const handleSave = async () => {
    if (!config) return;
    setSaveState('saving');
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setSaveState('success');
        setTimeout(() => setSaveState('idle'), 3000);
      } else {
        setSaveState('error');
      }
    } catch (err) {
      setSaveState('error');
    }
  };

  const checkOllama = async () => {
    if (!config?.llm?.ollama?.url) return;
    setOllamaStatus('checking');
    try {
      const res = await fetch(`${config.llm.ollama.url}/api/tags`).catch(() => null);
      setOllamaStatus(res && res.ok ? 'ok' : 'fail');
    } catch {
      setOllamaStatus('fail');
    }
  };

  /**
   * Updates a value within the nested configuration object.
   * 
   * @param path - Array of keys representing the path to the value.
   * @param value - The new value to set.
   */
  const updateNestedConfig = (path: string[], value: any) => {
    setConfig((prev: any) => {
      const next = { ...prev };
      let current = next;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return next;
    });
  };

  if (!config) {
    return (
      <div className="flex flex-1 items-center justify-center text-dim animate-pulse">
        <RefreshCw className="animate-spin mr-3" size={18} />
        Synchronizing system configuration...
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="w-[240px] border-r border-border p-8 flex flex-col gap-2 shrink-0 bg-bg/50 backdrop-blur-md">
        {[
          { id: 'brain', label: 'Intelligence' },
          { id: 'senses', label: 'Messaging' },
          { id: 'soul', label: 'Memory' }
        ].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-4 py-2.5 rounded-xl text-[12px] font-bold text-left transition-all ${
              activeSection === sec.id
                ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                : 'text-dim hover:bg-white/5 hover:text-text'
            }`}
          >
            {sec.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 p-16 max-w-[900px] overflow-y-auto custom-scrollbar">
        {activeSection === 'brain' && (
          <div className="space-y-10 animate-[fadeIn_0.3s_ease-out]">
            <header>
              <h2 className="text-3xl font-black mb-2 tracking-tighter">INTELLIGENCE</h2>
              <p className="text-accent-dim text-sm font-medium">Configure reasoning engines and cognitive parameters.</p>
            </header>
            
            <div className="space-y-8">
              <FormGroup label="Inference Endpoint" hint="The network address of your Ollama server.">
                <div className="flex gap-3">
                  <Input
                    value={config.llm?.ollama?.url || ''}
                    onChange={(e) => updateNestedConfig(['llm', 'ollama', 'url'], e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                  />
                  <button 
                    onClick={checkOllama}
                    className={`px-4 rounded-xl border border-border text-[10px] font-bold transition-all ${
                      ollamaStatus === 'ok' ? 'bg-success/10 text-success border-success/20' :
                      ollamaStatus === 'fail' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-panel text-dim hover:text-text'
                    }`}
                  >
                    {ollamaStatus === 'checking' ? '...' : 
                     ollamaStatus === 'ok' ? 'ONLINE' : 
                     ollamaStatus === 'fail' ? 'OFFLINE' : 'TEST'}
                  </button>
                </div>
              </FormGroup>
              <FormGroup label="Active Core Model">
                <Input
                  value={config.llm?.ollama?.model || ''}
                  onChange={(e) => updateNestedConfig(['llm', 'ollama', 'model'], e.target.value)}
                  placeholder="llama3"
                />
              </FormGroup>
              <div className="grid grid-cols-2 gap-8">
                <FormGroup label="Context Window" hint="Max tokens in active memory.">
                  <Input
                    type="number"
                    value={config.llm?.ollama?.contextWindow || ''}
                    onChange={(e) => updateNestedConfig(['llm', 'ollama', 'contextWindow'], parseInt(e.target.value))}
                  />
                </FormGroup>
                <FormGroup label="Creativity (Temp)" hint="0.0 (precise) to 1.0 (creative).">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={config.llm?.ollama?.temperature ?? ''}
                    onChange={(e) => updateNestedConfig(['llm', 'ollama', 'temperature'], parseFloat(e.target.value))}
                  />
                </FormGroup>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'senses' && (
          <div className="space-y-10 animate-[fadeIn_0.3s_ease-out]">
            <header>
              <h2 className="text-3xl font-black mb-2 tracking-tighter">SENSES</h2>
              <p className="text-accent-dim text-sm font-medium">Manage messaging channels and external input protocols.</p>
            </header>
            <div className="space-y-8">
              <FormGroup label="Telegram Bot Token">
                <Input
                  type="password"
                  value={config.telegram?.botToken || ''}
                  onChange={(e) => updateNestedConfig(['telegram', 'botToken'], e.target.value)}
                  placeholder="Paste token from @BotFather"
                />
              </FormGroup>
              <FormGroup label="Authorized Chat IDs" hint="Add your personal Chat ID here to enable Telegram access.">
                <textarea
                  className="w-full bg-black border border-border text-text px-4 py-4 rounded-2xl text-sm transition-all focus:border-white/20 outline-none min-h-[120px] font-mono"
                  placeholder="One ID per line..."
                  value={(config.telegram?.allowedChatIds || []).join('\n')}
                  onChange={(e) => updateNestedConfig(['telegram', 'allowedChatIds'], e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
                />
              </FormGroup>
            </div>
          </div>
        )}

        {activeSection === 'soul' && (
          <div className="space-y-10 animate-[fadeIn_0.3s_ease-out]">
            <header>
              <h2 className="text-3xl font-black mb-2 tracking-tighter">SOUL LAYER</h2>
              <p className="text-accent-dim text-sm font-medium">Configure long-term semantic memory and fact indexing.</p>
            </header>
            <div className="space-y-8">
              <FormGroup label="Memory Provider">
                <select
                  className="w-full bg-black border border-border text-text px-4 py-4 rounded-2xl text-sm outline-none appearance-none cursor-pointer focus:border-white/20"
                  value={config.brain?.memoryProvider || ''}
                  onChange={(e) => updateNestedConfig(['brain', 'memoryProvider'], e.target.value)}
                >
                  <option value="chetna">Chetna (Distributed Rust Core)</option>
                  <option value="local_sqlite">Local Vectorized SQLite</option>
                </select>
              </FormGroup>
              <FormGroup label="Chetna API URL">
                <Input
                  value={config.brain?.chetnaUrl || ''}
                  onChange={(e) => updateNestedConfig(['brain', 'chetnaUrl'], e.target.value)}
                  placeholder="http://127.0.0.1:1987"
                />
              </FormGroup>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 py-8 bg-gradient-to-t from-bg via-bg to-transparent mt-12 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className={`flex items-center gap-3 font-black px-10 py-4 rounded-2xl transition-all active:scale-95 text-xs tracking-widest ${
              saveState === 'success' ? 'bg-success text-bg' :
              saveState === 'error' ? 'bg-red-500 text-bg' :
              'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]'
            } disabled:opacity-50`}
          >
            {saveState === 'saving' ? <RefreshCw className="animate-spin" size={16} /> :
             saveState === 'success' ? <CheckCircle2 size={16} /> :
             saveState === 'error' ? <AlertCircle size={16} /> : 
             <Save size={16} />}
            {saveState === 'saving' ? 'SYNCHRONIZING...' :
             saveState === 'success' ? 'SYSTEM UPDATED' :
             saveState === 'error' ? 'SYNC FAILED' : 'SAVE CHANGES'}
          </button>
        </div>
        </div>
        </div>
        );
        }

        /**
        * A layout component for grouping form inputs.
        */
        function FormGroup({ label, hint, children }: { label: string, hint?: string, children: React.ReactNode }) {
        return (
        <div className="space-y-3">
        <label className="block text-[10px] text-accent-dim uppercase font-black tracking-[0.2em]">
        {label}
        </label>
        {children}
        {hint && <p className="text-xs text-[#444] font-medium leading-relaxed">{hint}</p>}
        </div>
        );
        }

        /**
        * A styled input component.
        */
        function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
        return (
        <input
        {...props}
        className="w-full bg-black border border-border text-white px-5 py-4 rounded-2xl text-sm transition-all focus:border-white/20 outline-none"
        />
        );
        }