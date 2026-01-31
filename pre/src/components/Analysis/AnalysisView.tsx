
import React, { useMemo, useState } from 'react';
import { Game } from '../../types';
import { getCompetitorLogo } from '../../services/api';
import { useMatchStats } from '../../hooks/useMatchStats';
import { ChevronLeft, BarChart2, History, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface AnalysisViewProps {
    match: Game;
    onBack: () => void;
}

const labelMap: Record<string, string> = {
    'Won The Game': 'VITÓRIA',
    'Both Teams To Score': 'AMBAS MARCAM',
    'Goals Scored': 'GOLS MARCADOS',
    'Over 2.5 Goals': 'MAIS DE 2.5 GOLS',
    'Under 2.5 Goals': 'MENOS DE 2.5 GOLS',
    'Clean Sheet': 'BALIZA ZERO',
    'Scored First': 'MARCOU PRIMEIRO',
    'Goals Conceded': 'GOLS SOFRIDOS',
    'Corners': 'ESCANTEIOS',
    'Cards': 'CARTÕES'
};

const ComparisonRow: React.FC<{
    label: string;
    homeVal: string;
    awayVal: string;
    isAverage?: boolean;
}> = ({ label, homeVal, awayVal, isAverage }) => (
    <div className="flex items-center justify-between py-4 px-6 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors">
        <div className="w-16 text-lg font-black text-white text-left">{homeVal}</div>
        <div className="flex-1 text-center px-2">
            <div className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] leading-relaxed">
                {labelMap[label] || label.toUpperCase()}
            </div>
        </div>
        <div className="w-16 text-lg font-black text-white text-right">{awayVal}</div>
    </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ match, onBack }) => {
    const [activeTab, setActiveTab] = useState<'INTEL' | 'HISTORY'>('INTEL');
    const { stats, loading } = useMatchStats(match.id);

    const groupedStats = useMemo(() => {
        const map = new Map<string, { home: string; away: string; group: number }>();

        stats.forEach(s => {
            const current = map.get(s.name) || { home: '-', away: '-', group: s.statisticGroup || 1 };
            if (String(s.competitorId) === String(match.homeCompetitor.id)) current.home = s.value;
            else if (String(s.competitorId) === String(match.awayCompetitor.id)) current.away = s.value;
            map.set(s.name, current);
        });

        const trends: [string, any][] = [];
        const averages: [string, any][] = [];

        map.forEach((val, key) => {
            // Logic from original code: group 2 usually means averages
            if (val.group === 2) averages.push([key, val]);
            else trends.push([key, val]);
        });

        return { trends, averages };
    }, [stats, match.homeCompetitor.id, match.awayCompetitor.id]);

    if (loading) return (
        <div className="py-40 flex flex-col items-center gap-6">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Analisando Dados...</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-4xl mx-auto pb-20">
            {/* Header Navigation */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-3 text-slate-500 hover:text-white transition-all group self-start sm:self-auto"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Voltar</span>
                </button>

                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
                    {[
                        { id: 'INTEL', label: 'INTELIGÊNCIA', icon: BarChart2 },
                        { id: 'HISTORY', label: 'HISTÓRICO', icon: History }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black transition-all",
                                activeTab === tab.id
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <tab.icon className="w-3 h-3" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'INTEL' ? (
                <div className="space-y-6">
                    {/* Main Trends Card */}
                    <div className="bg-[#0f141e] rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/50"></div>

                        <div className="bg-white/[0.02] px-6 py-5 border-b border-white/[0.05] flex justify-between items-center">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tendências</h3>
                            <div className="flex items-center gap-3">
                                <img src={getCompetitorLogo(match.homeCompetitor.id)} className="w-6 h-6 object-contain" />
                                <span className="text-[10px] font-black text-slate-600 italic">VS</span>
                                <img src={getCompetitorLogo(match.awayCompetitor.id)} className="w-6 h-6 object-contain" />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            {groupedStats.trends.length > 0 ? groupedStats.trends.map(([name, data]) => (
                                <ComparisonRow key={name} label={name} homeVal={data.home} awayVal={data.away} />
                            )) : (
                                <div className="p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Sem dados disponíveis.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Averages Card */}
                    {groupedStats.averages.length > 0 && (
                        <div className="bg-[#0f141e] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                            <div className="bg-primary/5 px-6 py-5 border-b border-white/[0.05]">
                                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1 h-3 bg-primary rounded-full"></div>
                                    Médias da Temporada
                                </h3>
                            </div>
                            <div className="flex flex-col">
                                {groupedStats.averages.map(([name, data]) => (
                                    <ComparisonRow key={name} label={name} homeVal={data.home} awayVal={data.away} isAverage />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-[#0f141e] rounded-3xl border border-white/5 p-20 text-center flex flex-col items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <History className="w-8 h-8 text-primary" />
                    </div>
                    <h4 className="text-lg font-black text-white uppercase tracking-widest">Em Desenvolvimento</h4>
                    <p className="text-slate-500 text-sm max-w-sm font-medium">O histórico detalhado estará disponível na próxima atualização.</p>
                </div>
            )}
        </div>
    );
};

export default AnalysisView;
