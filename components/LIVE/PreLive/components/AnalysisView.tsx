import React, { useMemo, useState } from 'react';
import { Game } from '../types';
import { getCompetitorLogo } from '../services/api';
import { useMatchStats } from '../hooks/useMatchStats';
import { ChevronLeft, BarChart2, History, Plus, Minus, Check, X, Filter } from 'lucide-react';
import clsx from 'clsx';
import ComparisonTable from './ComparisonTable';

interface AnalysisViewProps {
    match: Game;
    onBack: () => void;
}

const TeamAnalysisCard: React.FC<{
    team: { id: number; name: string };
    stats: any;
    matches: any[];
    label: string;
}> = ({ team, stats, matches, label }) => (
    <div className="bg-[#0f141e]/40 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden shadow-2xl transition-all hover:border-primary/20 group/card">
        {/* Team Header */}
        <div className="p-4 border-b border-white/[0.03] bg-gradient-to-r from-white/[0.02] to-transparent">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/[0.03] rounded-xl flex items-center justify-center p-1.5 border border-white/5 shadow-inner">
                        <img
                            src={getCompetitorLogo(team.id)}
                            alt={team.name}
                            className="w-full h-full object-contain filter drop-shadow-md"
                            onError={(e) => {
                                e.currentTarget.src = `https://pcvvirceciavsxxfinvv.supabase.co/storage/v1/object/public/images/team/placeholder.png`;
                            }}
                        />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-white/90 tracking-tight group-hover/card:text-white transition-colors">{team.name}</h2>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest opacity-80">{label}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Percentage Result */}
        <div className="p-8 text-center border-b border-white/[0.03] bg-white/[0.01] relative isolate overflow-hidden">
            <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full -translate-y-1/2 opacity-30 group-hover/card:opacity-50 transition-opacity"></div>
            <div className="relative">
                <div className="text-5xl font-bold mb-1 text-white tracking-tighter drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                    {stats.successRate.toFixed(1)}<span className="text-2xl text-primary/80 ml-0.5">%</span>
                </div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5 opacity-60">Taxa de Sucesso</div>
                <div className="text-[8px] text-slate-600 font-semibold uppercase tracking-wider">
                    <span className="text-slate-400">{stats.successCount}</span> / {stats.totalMatches} matches na amostragem
                </div>
            </div>
        </div>

        {/* Recent Matches */}
        <div className="p-5">
            <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/50"></div>
                Performance Recente
            </h3>
            <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                {matches.slice(0, 10).map((m, index) => {
                    const isSuccess = stats.matchResults[index];
                    const statValue = stats.matchValues?.[index] || 0;

                    const isHome = m.home_team_id ? m.home_team_id === team.id : m.homeTeam?.id === team.id;
                    const teamScore = m.home_score !== undefined ? (isHome ? m.home_score : m.away_score) : (m.event?.score ? (isHome ? m.event.score.home : m.event.score.away) : 0);
                    const opponentScore = m.home_score !== undefined ? (isHome ? m.away_score : m.home_score) : (m.event?.score ? (isHome ? m.event.score.away : m.event.score.home) : 0);
                    const opponentId = isHome ? (m.away_team_id || m.awayTeam?.id) : (m.home_team_id || m.homeTeam?.id);

                    return (
                        <div key={index} className="flex-shrink-0 w-20 group/match">
                            <div className={clsx(
                                "rounded-xl border p-2.5 flex flex-col items-center gap-2 transition-all duration-300",
                                "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]",
                                isSuccess ? "hover:border-green-500/30" : "hover:border-red-500/30"
                            )}>
                                <div className="flex items-center gap-1.5 opacity-60 group-hover/match:opacity-100 transition-opacity">
                                    <img
                                        src={getCompetitorLogo(isHome ? team.id : opponentId)}
                                        className="w-4 h-4 object-contain"
                                        onError={e => e.currentTarget.style.display = 'none'}
                                    />
                                    <span className="text-[10px] font-bold text-white/90 min-w-[32px] text-center">{teamScore}-{opponentScore}</span>
                                    <img
                                        src={getCompetitorLogo(isHome ? opponentId : team.id)}
                                        className="w-4 h-4 object-contain"
                                        onError={e => e.currentTarget.style.display = 'none'}
                                    />
                                </div>
                                <div className={clsx(
                                    "text-xl font-bold tracking-tighter transition-colors",
                                    isSuccess ? "text-green-400/90" : "text-red-400/90"
                                )}>
                                    {statValue}
                                </div>
                                <div className={clsx(
                                    "w-full h-1 rounded-full transition-all",
                                    isSuccess
                                        ? "bg-green-500/40 group-hover/match:bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]"
                                        : "bg-red-500/40 group-hover/match:bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                                )}>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
);

const AnalysisView: React.FC<AnalysisViewProps> = ({ match, onBack }) => {
    const [activeTab, setActiveTab] = useState<'PERCENT' | 'METRICS' | 'HISTORY'>('PERCENT');

    // Filters state
    const [statisticType, setStatisticType] = useState<'goals' | 'corners' | 'cards'>('goals');
    const [timePeriod, setTimePeriod] = useState<'firstHalf' | 'secondHalf' | 'fullTime'>('fullTime');
    const [comparisonType, setComparisonType] = useState<'over' | 'under'>('over');
    const [comparisonValue, setComparisonValue] = useState(0.5);
    const [numberOfMatches, setNumberOfMatches] = useState(10);

    const { homeHistory, awayHistory, getStats, comparisonMetrics, loading } = useMatchStats(
        match.homeCompetitor.id,
        match.awayCompetitor.id,
        match.competitionId,
        statisticType,
        timePeriod,
        numberOfMatches
    );

    const statsResult = useMemo(() => {
        if (loading || !homeHistory.length) return null;
        return getStats(statisticType, timePeriod, comparisonType, comparisonValue);
    }, [loading, homeHistory, awayHistory, statisticType, timePeriod, comparisonType, comparisonValue, getStats]);

    if (loading) return (
        <div className="py-20 flex flex-col items-center gap-6">
            <div className="relative">
                <div className="w-12 h-12 border-4 border-primary/20 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Processando Análise</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Cruzando dados históricos...</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-6xl mx-auto pb-10 px-4">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-3 text-slate-400 hover:text-white transition-all group shrink-0"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] group-hover:bg-white/[0.06] flex items-center justify-center transition-all border border-white/5 shadow-inner">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 group-hover:opacity-100">Voltar</span>
                </button>

                <div className="flex bg-black/20 backdrop-blur-2xl p-1 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar shadow-2xl relative">
                    <div className="absolute inset-0 bg-primary/5 blur-2xl opacity-50"></div>
                    {[
                        { id: 'PERCENT', label: 'ASSERTIVIDADE', icon: BarChart2 },
                        { id: 'METRICS', label: 'MÉTRICAS', icon: Filter },
                        { id: 'HISTORY', label: 'HISTÓRICO', icon: History }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[9px] font-bold transition-all whitespace-nowrap tracking-widest relative z-10",
                                activeTab === tab.id
                                    ? "bg-primary/90 text-white shadow-lg shadow-primary/20 backdrop-blur-md"
                                    : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quick Stats Panel */}
            <div className="bg-[#0f141e]/40 backdrop-blur-xl p-6 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group/panel">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover/panel:opacity-100 transition-opacity duration-1000"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-20"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover/panel:opacity-100 transition-opacity duration-700"></div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    {/* Qtd Jogos */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1 opacity-70">Amostragem</label>
                        <div className="relative">
                            <select
                                value={numberOfMatches}
                                onChange={(e) => setNumberOfMatches(Number(e.target.value))}
                                className="w-full bg-black/40 hover:bg-black/60 rounded-xl border border-white/10 px-4 py-3 text-[10px] font-bold text-white/90 focus:outline-none focus:border-primary/40 appearance-none transition-all cursor-pointer shadow-inner"
                            >
                                <option value={5}>Últimos 05</option>
                                <option value={10}>Últimos 10</option>
                                <option value={15}>Últimos 15</option>
                                <option value={20}>Últimos 20</option>
                            </select>
                        </div>
                    </div>

                    {/* Stat Type */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1 opacity-70">Mercado</label>
                        <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/10 shadow-inner">
                            {[
                                { id: 'goals', label: 'Gols' },
                                { id: 'corners', label: 'Cantos' },
                                { id: 'cards', label: 'Cards' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setStatisticType(t.id as any)}
                                    className={clsx(
                                        "flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all tracking-wider",
                                        statisticType === t.id ? "bg-white/[0.08] text-white shadow-lg border border-white/5" : "text-slate-500 hover:text-slate-400"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Period */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1 opacity-70">Tempo</label>
                        <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/10 shadow-inner">
                            {[
                                { id: 'fullTime', label: 'FT' },
                                { id: 'firstHalf', label: '1H' },
                                { id: 'secondHalf', label: '2H' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTimePeriod(t.id as any)}
                                    className={clsx(
                                        "flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all tracking-wider",
                                        timePeriod === t.id ? "bg-white/[0.08] text-white shadow-lg border border-white/5" : "text-slate-500 hover:text-slate-400"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comparison */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1 opacity-70">Filtro</label>
                        <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/10 shadow-inner">
                            {[
                                { id: 'over', label: 'Acima' },
                                { id: 'under', label: 'Abaixo' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setComparisonType(t.id as any)}
                                    className={clsx(
                                        "flex-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all tracking-wider",
                                        comparisonType === t.id ? "bg-white/[0.08] text-white shadow-lg border border-white/5" : "text-slate-500 hover:text-slate-400"
                                    )}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Value */}
                    <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1 opacity-70">Valor</label>
                        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 shadow-inner">
                            <button
                                onClick={() => setComparisonValue(v => Math.max(0.5, v - 0.5))}
                                className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all flex items-center justify-center active:scale-90 border border-white/5"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <div className="flex-1 text-center text-lg font-bold text-white tracking-tighter drop-shadow-md">{comparisonValue.toFixed(1)}</div>
                            <button
                                onClick={() => setComparisonValue(v => v + 0.5)}
                                className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all flex items-center justify-center active:scale-90 border border-white/5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {activeTab === 'PERCENT' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {statsResult ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <TeamAnalysisCard
                                team={{ id: match.homeCompetitor.id, name: match.homeCompetitor.name }}
                                stats={statsResult.home}
                                matches={homeHistory}
                                label="Mandante · Histórico"
                            />
                            <TeamAnalysisCard
                                team={{ id: match.awayCompetitor.id, name: match.awayCompetitor.name }}
                                stats={statsResult.away}
                                matches={awayHistory}
                                label="Visitante · Histórico"
                            />
                        </div>
                    ) : (
                        <div className="py-32 text-center bg-[#0f141e] rounded-[3rem] border border-white/5 flex flex-col items-center gap-4">
                            <BarChart2 className="w-12 h-12 text-slate-800" />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Aguardando Amostragem...</span>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'METRICS' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {comparisonMetrics ? (
                        <ComparisonTable metrics={comparisonMetrics} />
                    ) : (
                        <div className="py-32 text-center bg-[#0f141e] rounded-[3rem] border border-white/5 flex flex-col items-center gap-4">
                            <Filter className="w-12 h-12 text-slate-800" />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-[0.2em]">Calculando Métricas...</span>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Home History List */}
                    <div className="bg-[#0f141e]/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl group/home">
                        <div className="p-8 border-b border-white/[0.03] bg-gradient-to-r from-white/[0.02] to-transparent flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/[0.03] rounded-xl flex items-center justify-center p-2 border border-white/5 shadow-inner">
                                <img src={getCompetitorLogo(match.homeCompetitor.id)} className="w-full h-full object-contain filter drop-shadow-md" onError={e => e.currentTarget.src = ''} />
                            </div>
                            <h3 className="text-[10px] font-bold text-white/90 uppercase tracking-[0.2em]">{match.homeCompetitor.name}</h3>
                        </div>
                        <div className="divide-y divide-white/[0.02]">
                            {homeHistory.map((m, idx) => {
                                const homeId = m.home_team_id || m.homeTeam?.id;
                                const awayId = m.away_team_id || m.awayTeam?.id;
                                return (
                                    <div key={idx} className="px-8 py-5 flex justify-between items-center hover:bg-white/[0.02] transition-all group/row">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] text-slate-500 font-bold opacity-60">{new Date((m.events?.timeStartTimestamp || m.time_start_timestamp) * 1000).toLocaleDateString('pt-BR')}</span>
                                            <span className="text-[8px] text-slate-700 font-bold uppercase tracking-tight group-hover/row:text-primary/60 transition-colors">Rodada de Campeonato</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2.5 text-right">
                                                <span className="text-[10px] font-semibold text-white/80 group-hover/row:text-white transition-colors">{(m.homeTeam?.shortname || m.home_team_name)}</span>
                                                <img src={getCompetitorLogo(homeId)} className="w-4 h-4 object-contain opacity-60 group-hover/row:opacity-100 transition-opacity" onError={e => e.currentTarget.style.display = 'none'} />
                                            </div>
                                            <div className="px-3 py-1 bg-white/[0.03] rounded-lg border border-white/5 group-hover/row:border-primary/20 transition-all">
                                                <span className="text-[10px] font-bold text-slate-400 group-hover/row:text-primary transition-colors">{m.home_score ?? m.events?.homeScoreCurrent} : {m.away_score ?? m.events?.awayScoreCurrent}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <img src={getCompetitorLogo(awayId)} className="w-4 h-4 object-contain opacity-60 group-hover/row:opacity-100 transition-opacity" onError={e => e.currentTarget.style.display = 'none'} />
                                                <span className="text-[10px] font-semibold text-white/80 group-hover/row:text-white transition-colors">{(m.awayTeam?.shortname || m.away_team_name)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* Away History List */}
                    <div className="bg-[#0f141e]/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl group/away">
                        <div className="p-8 border-b border-white/[0.03] bg-gradient-to-r from-white/[0.02] to-transparent flex items-center gap-4">
                            <div className="w-10 h-10 bg-white/[0.03] rounded-xl flex items-center justify-center p-2 border border-white/5 shadow-inner">
                                <img src={getCompetitorLogo(match.awayCompetitor.id)} className="w-full h-full object-contain filter drop-shadow-md" onError={e => e.currentTarget.src = ''} />
                            </div>
                            <h3 className="text-[10px] font-bold text-white/90 uppercase tracking-[0.2em]">{match.awayCompetitor.name}</h3>
                        </div>
                        <div className="divide-y divide-white/[0.02]">
                            {awayHistory.map((m, idx) => {
                                const homeId = m.home_team_id || m.homeTeam?.id;
                                const awayId = m.away_team_id || m.awayTeam?.id;
                                return (
                                    <div key={idx} className="px-8 py-5 flex justify-between items-center hover:bg-white/[0.02] transition-all group/row">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[9px] text-slate-500 font-bold opacity-60">{new Date((m.events?.timeStartTimestamp || m.time_start_timestamp) * 1000).toLocaleDateString('pt-BR')}</span>
                                            <span className="text-[8px] text-slate-700 font-bold uppercase tracking-tight group-hover/row:text-primary/60 transition-colors">Rodada de Campeonato</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2.5 text-right">
                                                <span className="text-[10px] font-semibold text-white/80 group-hover/row:text-white transition-colors">{(m.homeTeam?.shortname || m.home_team_name)}</span>
                                                <img src={getCompetitorLogo(homeId)} className="w-4 h-4 object-contain opacity-60 group-hover/row:opacity-100 transition-opacity" onError={e => e.currentTarget.style.display = 'none'} />
                                            </div>
                                            <div className="px-3 py-1 bg-white/[0.03] rounded-lg border border-white/5 group-hover/row:border-primary/20 transition-all">
                                                <span className="text-[10px] font-bold text-slate-400 group-hover/row:text-primary transition-colors">{m.home_score ?? m.events?.homeScoreCurrent} : {m.away_score ?? m.events?.awayScoreCurrent}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <img src={getCompetitorLogo(awayId)} className="w-4 h-4 object-contain opacity-60 group-hover/row:opacity-100 transition-opacity" onError={e => e.currentTarget.style.display = 'none'} />
                                                <span className="text-[10px] font-semibold text-white/80 group-hover/row:text-white transition-colors">{(m.awayTeam?.shortname || m.away_team_name)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalysisView;
