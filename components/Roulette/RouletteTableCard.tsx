import React, { useMemo } from 'react';
import { RouletteTable, getNumberColor } from '../../services/rouletteApi';

interface Props {
  table: RouletteTable;
}

export const RouletteTableCard: React.FC<Props> = ({ table }) => {
  const stats = useMemo(() => {
    let red = 0;
    let black = 0;
    let green = 0;
    table.lastResults.forEach(num => {
      const color = getNumberColor(num);
      if (color === 'red') red++;
      else if (color === 'black') black++;
      else if (color === 'green') green++;
    });
    
    const total = red + black + green;
    return {
      red: total > 0 ? (red / total) * 100 : 0,
      black: total > 0 ? (black / total) * 100 : 0,
      green: total > 0 ? (green / total) * 100 : 0,
      count: total
    };
  }, [table.lastResults]);

  return (
    <div className="bg-[#0a0a0c]/80 border border-white/[0.05] rounded-[1.5rem] p-5 flex flex-col gap-4 hover:bg-[#111115] hover:border-[#C8A96E]/30 transition-all group overflow-hidden relative">
      {/* Background glow when hovered */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8A96E] rounded-full opacity-0 blur-3xl group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="flex justify-between items-start z-10 relative">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#1E1E28] shrink-0">
             <img src={table.image} alt={table.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-[13px] font-bold text-[#F0F0F4] tracking-tight">{table.name}</h3>
            <span className="text-[10px] font-medium text-[#8888A0] mt-0.5 flex items-center gap-1.5">
              <i className="fa-solid fa-user-tie text-[9px] opacity-70"></i> 
              {table.dealerName || "Auto"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
           <div className="px-2.5 py-1 bg-[#13131A] border border-[#1E1E28] rounded-full flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
             <span className="text-[9px] font-bold text-[#F0F0F4] tracking-wider">{table.seatsTaken}</span>
           </div>
        </div>
      </div>

      {/* Mini Stats Bar */}
      <div className="w-full h-1.5 flex rounded-full overflow-hidden opacity-80 mt-2 z-10">
        <div className="h-full bg-red-500" style={{ width: `${stats.red}%` }}></div>
        <div className="h-full bg-emerald-500" style={{ width: `${stats.green}%` }}></div>
        <div className="h-full bg-[#111115] border-y border-white/10" style={{ width: `${stats.black}%` }}></div>
      </div>

      <div className="flex justify-between items-center z-10 mt-1">
         <span className="text-[9px] font-medium text-red-500">{stats.red.toFixed(0)}%</span>
         <span className="text-[9px] font-medium text-emerald-500">{stats.green.toFixed(0)}%</span>
         <span className="text-[9px] font-medium text-[#8888A0]">{stats.black.toFixed(0)}%</span>
      </div>

      {/* Last Results */}
      <div className="pt-4 border-t border-[#1E1E28] mt-1 z-10 relative">
        <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#44445A] block mb-2">Últimos Números</span>
        <div className="flex gap-1.5 overflow-x-auto custom-scroll pb-1">
          {table.lastResults.map((num, i) => {
             const color = getNumberColor(num);
             let bgClass = color === 'red' ? 'bg-[#E63946] border-[#E63946] text-white shadow-[0_2px_8px_rgba(230,57,70,0.5)]' 
                           : color === 'black' ? 'bg-[#18181B] border-[#27272A] text-white shadow-[0_2px_8px_rgba(0,0,0,0.8)]' 
                           : 'bg-[#2A9D8F] border-[#2A9D8F] text-white shadow-[0_2px_8px_rgba(42,157,143,0.5)]';
             
             // O mais recente (índice 0) ganha uma animação e um brilho
             const isNewest = i === 0;
             if (isNewest) {
                bgClass += ' animate-in fade-in zoom-in slide-in-from-left duration-500 scale-110 z-10 ring-2 ring-offset-1 ring-offset-[#0A0A0D] ' + (color === 'red' ? 'ring-[#E63946]' : color === 'black' ? 'ring-[#8888A0]' : 'ring-[#2A9D8F]');
             }

             return (
               <div key={`${num}-${i}`} className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-bold tabular-nums shadow-sm ${bgClass}`}>
                  {num}
               </div>
             );
          })}
        </div>
      </div>
      
    </div>
  );
};
