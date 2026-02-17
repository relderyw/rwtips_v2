import React from 'react';
import { ComparisonMetrics } from '../services/statistics';

interface ComparisonTableProps {
    metrics: ComparisonMetrics;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ metrics }) => {
    const statRows = [
        { label: "Gols", for: metrics.home.goals, against: metrics.away.goals, avg: metrics.average.goals },
        { label: "Escanteios", for: metrics.home.corners, against: metrics.away.corners, avg: metrics.average.corners },
        { label: "Cartões", for: metrics.home.cards, against: metrics.away.cards, avg: metrics.average.cards },
        { label: "Chutes no Alvo", for: metrics.home.shotsOnTarget, against: metrics.away.shotsOnTarget, avg: metrics.average.shotsOnTarget },
        { label: "Chutes na Área", for: metrics.home.shotsInTheBox, against: metrics.away.shotsInTheBox, avg: metrics.average.shotsInTheBox },
        { label: "Chutes Fora da Área", for: metrics.home.shotsOutsideTheBox, against: metrics.away.shotsOutsideTheBox, avg: metrics.average.shotsOutsideTheBox },
        { label: "Total de Chutes", for: metrics.home.totalShots, against: metrics.away.totalShots, avg: metrics.average.totalShots },
        { label: "Chutes Fora do Alvo", for: metrics.home.shotsOffTarget, against: metrics.away.shotsOffTarget, avg: metrics.average.shotsOffTarget },
        { label: "Faltas", for: metrics.home.fouls, against: metrics.away.fouls, avg: metrics.average.fouls },
        { label: "Pênaltis", for: metrics.home.penalties, against: metrics.away.penalties, avg: metrics.average.penalties },
        { label: "Cartões Amarelos", for: metrics.home.yellowCards, against: metrics.away.yellowCards, avg: metrics.average.yellowCards },
        { label: "Cartões Vermelhos", for: metrics.home.redCards, against: metrics.away.redCards, avg: metrics.average.redCards },
    ];

    return (
        <div className="bg-[#0f141e]/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-2xl transition-all">
            <div className="overflow-x-auto no-scrollbar">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-white/[0.03] border-b border-white/[0.05]">
                            <th className="text-left p-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-8">Tipo de Estatística</th>
                            <th className="text-center p-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Média Geral</th>
                            <th className="text-center p-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Casa</th>
                            <th className="text-center p-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest pr-8">Visitante</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                        {statRows.map((row, index) => (
                            <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="p-4 pl-8 text-xs font-medium text-white/80 group-hover:text-white transition-colors">{row.label}</td>
                                <td className="p-4 text-center">
                                    <div className="inline-flex px-2 py-1 bg-white/[0.03] rounded-lg text-xs font-bold text-slate-500 min-w-[50px] justify-center border border-white/5">
                                        {row.avg.toFixed(2)}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-xs font-bold text-blue-400/80 group-hover:text-blue-400 group-hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.3)] transition-all">
                                        {row.for.toFixed(2)}
                                    </span>
                                </td>
                                <td className="p-4 text-center pr-8">
                                    <span className="text-xs font-bold text-red-400/80 group-hover:text-red-400 group-hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.3)] transition-all">
                                        {row.against.toFixed(2)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ComparisonTable;
