
import React from 'react';
import { Calendar, Radio, LayoutDashboard, UserCircle, Target, MapPin } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'upcoming', icon: Calendar, label: 'Próximos Jogos' },
    { id: 'live', icon: Radio, label: 'AO VIVO' },
    { id: 'history', icon: LayoutDashboard, label: 'Resultados' },
    { id: 'players', icon: UserCircle, label: 'Jogadores' },
    { id: 'radar', icon: Target, label: 'Radar' },
    { id: 'over', icon: MapPin, label: 'Over Analysis' },
  ];

  return (
    <nav className="fixed left-0 top-0 h-screen w-20 hover:w-64 bg-black border-r border-zinc-900 transition-all duration-300 z-50 overflow-hidden group shadow-2xl">
      <div className="p-4 flex items-center gap-4 border-b border-zinc-900 h-20">
        <img 
          src="https://i.ibb.co/G4Y8sHMk/Chat-GPT-Image-21-de-abr-de-2025-16-14-34-1.png" 
          alt="RW Tips" 
          className="w-10 h-10 rounded-full flex-shrink-0 ring-2 ring-emerald-500/20"
        />
        <span className="font-oxanium font-bold text-xl text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">RW TIPS</span>
      </div>
      
      <ul className="mt-6 space-y-2">
        {menuItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-200 relative ${
                activeTab === item.id 
                  ? 'bg-emerald-950/10 text-emerald-500' 
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <item.icon className={`w-6 h-6 flex-shrink-0 ${activeTab === item.id ? 'stroke-[2.5px]' : ''}`} />
              <span className="font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-sm">
                {item.label}
              </span>
              {activeTab === item.id && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-emerald-500 rounded-r-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;
