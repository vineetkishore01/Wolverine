import { useState, useEffect } from 'react';

/**
 * SettingsView component allows users to view and modify Wolverine's system configuration.
 * Config is divided into three sections: Intelligence (LLM), Senses (Channels), and Soul (Memory).
 * 
 * @returns A JSX element representing the settings dashboard.
 */
export function SettingsView() {
  const [activeSection, setActiveSection] = useState('brain');
  const [config, setConfig] = useState<any>(null);

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
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Settings Synchronized.');
    } catch (err) {
      alert('Failed to save settings.');
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
    return <div className="p-8 text-dim">Loading configuration...</div>;
  }

  return (
    <div className="flex flex-1 h-full">
      <div className="w-[220px] border-r border-border p-8 flex flex-col gap-1.5 shrink-0 bg-bg">
        {[
          { id: 'brain', label: 'Intelligence' },
          { id: 'senses', label: 'Messaging' },
          { id: 'soul', label: 'Memory' }
        ].map((sec) => (
          <button
            key={sec.id}
            onClick={() => setActiveSection(sec.id)}
            className={`px-4 py-2 rounded-xl text-[12px] font-medium text-left transition-all ${
              activeSection === sec.id
                ? 'bg-accent text-bg shadow-lg'
                : 'text-dim hover:bg-panel hover:text-text'
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-16 max-w-[800px] overflow-y-auto animate-[fadeIn_0.3s_ease-out]">
        {activeSection === 'brain' && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl font-bold mb-1 tracking-tight">Intelligence</h2>
              <p className="text-accent-dim text-sm">Configure the reasoning engines and model parameters.</p>
            </header>
            
            <div className="space-y-6">
              <FormGroup label="Ollama Endpoint" hint="The network address of your inference server.">
                <Input
                  value={config.llm?.ollama?.url || ''}
                  onChange={(e) => updateNestedConfig(['llm', 'ollama', 'url'], e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                />
              </FormGroup>
              <FormGroup label="Active Model">
                <Input
                  value={config.llm?.ollama?.model || ''}
                  onChange={(e) => updateNestedConfig(['llm', 'ollama', 'model'], e.target.value)}
                  placeholder="llama3"
                />
              </FormGroup>
              <FormGroup label="Context Window" hint="Number of tokens to keep in active memory.">
                <Input
                  type="number"
                  value={config.llm?.ollama?.contextWindow || ''}
                  onChange={(e) => updateNestedConfig(['llm', 'ollama', 'contextWindow'], parseInt(e.target.value))}
                />
              </FormGroup>
            </div>
          </div>
        )}

        {activeSection === 'senses' && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl font-bold mb-1 tracking-tight">Senses</h2>
              <p className="text-accent-dim text-sm">Manage messaging channels and security protocols.</p>
            </header>
            <div className="space-y-6">
              <FormGroup label="Telegram Token">
                <Input
                  type="password"
                  value={config.telegram?.botToken || ''}
                  onChange={(e) => updateNestedConfig(['telegram', 'botToken'], e.target.value)}
                />
              </FormGroup>
              <FormGroup label="Authorized Chat IDs" hint="One ID per line. Only these users can command Wolverine.">
                <textarea
                  className="w-full bg-panel border border-border text-text px-4 py-3 rounded-xl text-sm transition-all focus:ring-1 focus:ring-accent outline-none"
                  rows={4}
                  value={(config.telegram?.allowedChatIds || []).join('\n')}
                  onChange={(e) => updateNestedConfig(['telegram', 'allowedChatIds'], e.target.value.split('\n').filter(s => s.trim()))}
                />
              </FormGroup>
            </div>
          </div>
        )}

        {activeSection === 'soul' && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl font-bold mb-1 tracking-tight">Memory Layer</h2>
              <p className="text-accent-dim text-sm">Configure long-term semantic memory (Chetna).</p>
            </header>
            <div className="space-y-6">
              <FormGroup label="Memory Provider">
                <select
                  className="w-full bg-panel border border-border text-text px-4 py-3 rounded-xl text-sm outline-none appearance-none cursor-pointer"
                  value={config.brain?.memoryProvider || ''}
                  onChange={(e) => updateNestedConfig(['brain', 'memoryProvider'], e.target.value)}
                >
                  <option value="chetna">Chetna (Rust Core)</option>
                  <option value="local_sqlite">Local Standalone</option>
                </select>
              </FormGroup>
              <FormGroup label="Chetna API URL">
                <Input
                  value={config.brain?.chetnaUrl || ''}
                  onChange={(e) => updateNestedConfig(['brain', 'chetnaUrl'], e.target.value)}
                />
              </FormGroup>
            </div>
          </div>
        )}

        <div className="sticky bottom-0 py-8 bg-bg/80 backdrop-blur-md border-t border-border mt-12 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-accent text-bg font-bold px-8 py-3 rounded-xl transition-all active:scale-95 shadow-lg text-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A layout component for grouping form inputs with a label and optional hint.
 */
function FormGroup({ label, hint, children }: { label: string, hint?: string, children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <label className="block text-[11px] text-accent-dim mb-2.5 uppercase font-bold tracking-widest">
        {label}
      </label>
      {children}
      {hint && <div className="text-xs text-[#444] mt-2 leading-relaxed">{hint}</div>}
    </div>
  );
}

/**
 * A styled input component for settings forms.
 */
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-black border border-border text-white px-4 py-3.5 rounded-xl text-sm transition-colors focus:border-[#444] outline-none"
    />
  );
}