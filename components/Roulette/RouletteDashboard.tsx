import React, { useState, useEffect } from 'react';
import { fetchRoulettes, RouletteTable } from '../../services/rouletteApi';
import { RouletteTableCard } from './RouletteTableCard';

export const RouletteDashboard: React.FC = () => {
  const [tables, setTables] = useState<RouletteTable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let interval: any;
    let mounted = true;

    const loadData = async () => {
      try {
        const data = await fetchRoulettes();
        if (mounted) {
          // Sort by seatsTaken descending
          const sorted = data.sort((a, b) => b.seatsTaken - a.seatsTaken);
          setTables(sorted);
          setLastUpdate(new Date());
          setIsLoading(false);
        }
      } catch (e) {
        console.error("Failed to load roulettes", e);
      }
    };

    loadData();
    interval = setInterval(loadData, 10000); // Polling every 10s

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredTables = tables.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.dealerName && t.dealerName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="w-12 h-12 border-2 border-[#C8A96E]/20 border-t-[#C8A96E] rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8888A0] animate-pulse">
          Estabelecendo conexão ONTIME com Casino...
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-8">
      {/* Header Info */}
      <div className="bg-[#111115] border border-[#1E1E28] p-5 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
             <i className="fa-solid fa-dharmachakra text-[#C8A96E] animate-spin-slow"></i>
             Roletas <span className="text-[#C8A96E]">ONTIME</span>
          </h2>
          <p className="text-xs font-medium text-[#8888A0]">Monitoramento das mesas da Evolution Gaming</p>
        </div>

        <div className="relative w-full md:w-96">
          <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-[#44445A] text-sm"></i>
          <input
            type="text"
            placeholder="Buscar por mesa ou dealer..."
            className="w-full bg-[#0A0A0D] border border-[#1E1E28] rounded-xl py-3.5 pl-12 pr-4 text-sm font-medium outline-none focus:border-[#C8A96E]/50 transition-all text-[#F0F0F4] placeholder:text-[#44445A] shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-emerald-500/90 tracking-wider">AO VIVO</span>
             <span className="text-[8px] font-medium text-[#8888A0]">At. {lastUpdate.toLocaleTimeString()}</span>
           </div>
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTables.map(table => (
          <RouletteTableCard key={table.id} table={table} />
        ))}
        {filteredTables.length === 0 && (
          <div className="col-span-full py-20 text-center text-[#8888A0] text-sm font-medium">
             Nenhuma mesa encontrada com esses critérios.
          </div>
        )}
      </div>
    </div>
  );
};
