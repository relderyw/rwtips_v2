
import React, { useMemo } from 'react';
import { useBettingLines } from '../hooks/useBettingLines';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

interface MarketsViewProps {
    gameId: number;
}

const MarketsView: React.FC<MarketsViewProps> = ({ gameId }) => {
    const { lines, loading } = useBettingLines(gameId);

    // Group lines by market type
    const groupedLines = useMemo(() => {
        if (!lines || lines.length === 0) return [];

        const groups = new Map<number, { name: string, lines: any[] }>();

        lines.forEach(line => {
            const typeId = line.lineTypeId;
            // Filter only main markets if desired, or show all.
            // Let's filter some popular ones for cleaner view if needed, 
            // but for now showing all distinct market types.

            if (!groups.has(typeId)) {
                groups.set(typeId, {
                    name: line.lineType.transValid ? line.lineType.name : (line.lineType.title || line.lineType.name),
                    lines: []
                });
            }
            groups.get(typeId)?.lines.push(line);
        });

        return Array.from(groups.values());
    }, [lines]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center gap-6">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Carregando Odds...</span>
            </div>
        );
    }

    if (groupedLines.length === 0) {
        return (
            <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Mercados indisponíveis para este jogo.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {groupedLines.map((group, idx) => (
                <div key={idx} className="bg-[#0f141e] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
                    {/* Market Header */}
                    <div className="bg-white/[0.02] px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
                        <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                        <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest leading-none">
                            {group.name}
                        </h3>
                    </div>

                    {/* Lines / Options */}
                    <div className="p-4 space-y-3">
                        {group.lines.map((line: any) => (
                            <div key={line.lineId} className="flex flex-col gap-2">
                                {line.internalOption && (
                                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider ml-1">
                                        {line.internalOption}
                                    </span>
                                )}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {line.options.map((opt: any) => (
                                        <div key={opt.num} className="bg-white/5 hover:bg-white/10 transition-colors rounded-lg p-2.5 flex flex-col items-center justify-center border border-white/5 relative group cursor-pointer">
                                            {/* Trend Indicator */}
                                            {opt.trend === 1 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full opacity-50"></span>}
                                            {opt.trend === 3 && <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full opacity-50"></span>}

                                            <span className="text-[10px] font-bold text-slate-400 mb-0.5">{opt.name}</span>
                                            <span className={clsx(
                                                "text-sm font-black tracking-tight",
                                                opt.trend === 1 ? "text-red-400" : opt.trend === 3 ? "text-green-400" : "text-white"
                                            )}>
                                                {opt.rate.decimal.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MarketsView;
