import { MessageSquare, Activity, Settings } from 'lucide-react';

/**
 * Properties for the Sidebar component.
 */
interface SidebarProps {
  /** The ID of the currently active navigation tab. */
  activeTab: string;
  /** Callback function triggered when a navigation tab is clicked. */
  onTabChange: (tab: string) => void;
}

/**
 * Sidebar component that provides the primary navigation for the Wolverine Web UI.
 * Displays icons for Chat, Trace, and Config views.
 * 
 * @param props - Component properties including activeTab and onTabChange callback.
 * @returns A JSX element representing the sidebar.
 */
export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'trace', label: 'Trace', icon: Activity },
    { id: 'settings', label: 'Config', icon: Settings },
  ];

  return (
    <nav className="w-[68px] bg-bg border-r border-border flex flex-col items-center py-6 gap-8 z-50 shrink-0">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-bg font-black text-xl mb-4">W</div>
      
      <div className="flex flex-col gap-5 w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 w-full transition-all duration-300 relative ${
                isActive ? 'text-accent' : 'text-accent-dim hover:text-accent'
              }`}
              title={tab.label}
            >
              {isActive && (
                <div className="absolute left-0 w-[3px] h-5 bg-accent rounded-r-full" />
              )}
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} strokeWidth={2} />
              <span className={`text-[8px] uppercase tracking-widest font-bold transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}