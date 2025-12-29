
import React, { useMemo, useState } from 'react';
import { generateStrategyReport, STRATEGY_THEMES } from '../services/analyzer';
import { HistoryMatch } from '../types';

interface StrategyStats {
    total: number;
    green: number;
    red: number;
    sumConfidence?: number;
}

interface ReportItem {
    date: string;
    league: string;
    strategies: Record<string, StrategyStats>;
}

interface StrategyHistoryProps {
    history: HistoryMatch[];
}

export const StrategyHistory: React.FC<StrategyHistoryProps> = ({ history }) => {
    const [matchLimit, setMatchLimit] = useState<number>(10);

    const report = useMemo(() =>
        generateStrategyReport(history, matchLimit) as ReportItem[],
        [history, matchLimit]
    );

    const globalTotals = useMemo(() => {
        const totals: Record<string, StrategyStats> = {};

        report.forEach((item: ReportItem) => {
            Object.entries(item.strategies).forEach(([key, stats]: [string, StrategyStats]) => {
                if (!totals[key]) totals[key] = { total: 0, green: 0, red: 0, sumConfidence: 0 };
                totals[key].total += stats.total;
                totals[key].green += stats.green;
                totals[key].red += stats.red;
                totals[key].sumConfidence! += stats.sumConfidence || 0;
            });
        });

        return totals;
    }, [report]);

    if (!history || history.length === 0) {
        return (
            <div className="py-20 text-center opacity-20">
                <i className="fa-solid fa-chart-pie text-5xl mb-4"></i>
                <p className="text-xs font-black uppercase tracking-widest">Aguardando dados históricos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* FILTER CONTROLS */}
            <div className="mx-4 p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-wrap items-end gap-6 shadow-xl backdrop-blur-sm">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Analisar últimos X jogos (p/ Liga)</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={matchLimit}
                            onChange={(e) => setMatchLimit(parseInt(e.target.value) || 1)}
                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/80 focus:border-emerald-500/50 outline-none transition-all w-24 text-center font-black"
                        />
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Amostra de back-testing</span>
                    </div>
                </div>

                <div className="flex-1 flex justify-end">
                    <div className="px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-3">
                        <i className="fa-solid fa-bolt text-emerald-500 text-[10px]"></i>
                        <span className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">
                            {Object.keys(globalTotals).length} Estratégias Ativas
                        </span>
                    </div>
                </div>
            </div>

            {/* GLOBAL SUMMARY */}
            <div className="flex flex-wrap gap-3 justify-center text-center px-4">
                <div className="w-full mb-2">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Resumo Global de Performance</h3>
                </div>
                {Object.entries(globalTotals).map(([key, stats]: [string, StrategyStats]) => {
                    const theme = STRATEGY_THEMES[key] || { label: key.toUpperCase(), color: '#fff', icon: 'fa-star' };
                    const winRate = stats.total > 0 ? (stats.green / stats.total) * 100 : 0;
                    const avgConf = stats.total > 0 ? (stats.sumConfidence || 0) / stats.total : 0;

                    return (
                        <div key={key} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col items-center min-w-[140px] relative overflow-hidden group">
                            {/* Confidence Indicator Line */}
                            <div className="absolute top-0 left-0 h-1 bg-emerald-500/20 w-full">
                                <div className="h-full bg-emerald-500/60" style={{ width: `${avgConf}%` }}></div>
                            </div>

                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 mt-1" style={{ backgroundColor: `${theme.color}15`, border: `1px solid ${theme.color}30` }}>
                                <i className={`fa-solid ${theme.icon || 'fa-star'} text-sm`} style={{ color: theme.color }}></i>
                            </div>
                            <span className="text-[9px] font-black text-white/40 uppercase mb-1 truncate w-full tracking-wider">{theme.label}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-white leading-none tabular-nums">{winRate.toFixed(0)}%</span>
                                <span className="text-[10px] font-bold text-white/20 italic tabular-nums">{avgConf.toFixed(0)}% cf</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded-md">{stats.green}G</span>
                                <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[9px] font-black rounded-md">{stats.red}R</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* DETAILED TABLE */}
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Data / Liga</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Resumo de Assertividade</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Estratégias Válidas (Nova Lógica)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {report.map((item: ReportItem, idx: number) => {
                                const dayStrategies = Object.values(item.strategies);
                                const dayTotal = dayStrategies.reduce((acc: number, s: StrategyStats) => acc + s.total, 0);
                                const dayGreen = dayStrategies.reduce((acc: number, s: StrategyStats) => acc + s.green, 0);
                                const dayRed = dayStrategies.reduce((acc: number, s: StrategyStats) => acc + s.red, 0);
                                const dayWinRate = dayTotal > 0 ? (dayGreen / dayTotal) * 100 : 0;

                                return (
                                    <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-white/90 group-hover:text-emerald-400 transition-colors uppercase">{item.date}</span>
                                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">{item.league}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-white tabular-nums">{dayWinRate.toFixed(0)}%</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-black text-emerald-500">{dayGreen}G</span>
                                                        <span className="text-[9px] font-black text-white/10">|</span>
                                                        <span className="text-[9px] font-black text-rose-500">{dayRed}R</span>
                                                    </div>
                                                </div>
                                                <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: `${dayWinRate}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(item.strategies).map(([sKey, sStats]: [string, StrategyStats]) => {
                                                    const theme = STRATEGY_THEMES[sKey] || { label: sKey.toUpperCase(), color: '#fff', icon: 'fa-star' };
                                                    const sConf = sStats.total > 0 ? (sStats.sumConfidence || 0) / sStats.total : 0;
                                                    return (
                                                        <div key={sKey} className="flex flex-col gap-1 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 min-w-[110px]">
                                                            <div className="flex items-center gap-2">
                                                                <i className={`fa-solid ${theme.icon || 'fa-star'} text-[8px]`} style={{ color: theme.color }}></i>
                                                                <span className="text-[8px] font-black text-white/80 uppercase truncate max-w-[80px]">{theme.label}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/[0.05]">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[9px] font-black text-emerald-400">{sStats.green}</span> / <span className="text-[9px] font-black text-rose-400">{sStats.red}</span>
                                                                </div>
                                                                <span className="text-[8px] font-bold text-white/20 italic">{sConf.toFixed(0)}% cf</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
