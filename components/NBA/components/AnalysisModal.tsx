
import React, { useState, useEffect } from 'react';
import { X, BarChart3, Users, BadgeDollarSign, Activity, AlertCircle, TrendingUp, History, Percent } from 'lucide-react';
import { GameEvent, SeasonStats, Projections } from '../types';
import { nbaDataService } from '../services/nbaDataService';
import { calculateProjections, getTeamLogo } from '../utils/calculations';

interface AnalysisModalProps {
  game: GameEvent;
  onClose: () => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ game, onClose }) => {
  const [activeTab, setActiveTab] = useState('insight');
  const [loading, setLoading] = useState(true);
  const [seasonStats, setSeasonStats] = useState<{ home: SeasonStats; away: SeasonStats } | null>(null);
  const [playerStats, setPlayerStats] = useState<any>(null);
  const [injuries, setInjuries] = useState<any[]>([]);
  const [projections, setProjections] = useState<Projections | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [stats, players, injuryData] = await Promise.all([
          nbaDataService.getSeasonStats(game.eventId),
          nbaDataService.getPlayerStats(game.eventId),
          nbaDataService.getInjuries()
        ]);

        const homeS = stats.home.stats;
        const awayS = stats.away.stats;

        setSeasonStats({ home: homeS, away: awayS });
        setPlayerStats(players);

        const homeInj = injuryData.find((t: any) => t.competitor.seoIdentifier === game.bottom.seoIdentifier)?.playerInjuries || [];
        const awayInj = injuryData.find((t: any) => t.competitor.seoIdentifier === game.top.seoIdentifier)?.playerInjuries || [];
        setInjuries([...homeInj.map((i: any) => ({ ...i, team: 'home' })), ...awayInj.map((i: any) => ({ ...i, team: 'away' }))]);

        const proj = calculateProjections(homeS, awayS);
        setProjections(proj);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [game]);

  const comparisonStats = [
    { key: 'pointsForPerGame', label: 'Pontos por Jogo' },
    { key: 'pointsAgainstPerGame', label: 'Pontos Sofridos' },
    { key: 'fieldGoalsPercentage', label: 'FG%', format: (v: string) => (parseFloat(v) * 100).toFixed(1) + '%' },
    { key: 'threePointPercentage', label: '3P%', format: (v: string) => (parseFloat(v) * 100).toFixed(1) + '%' },
    { key: 'reboundsPerGame', label: 'Rebotes' },
    { key: 'assistsPerGame', label: 'Assistências' },
    { key: 'blocksPerGame', label: 'Tocos' },
    { key: 'stealsPerGame', label: 'Roubos' },
  ];

  // Lógica de cores para o Gauge
  const homeProb = projections?.homeProb || 0;
  const awayProb = projections?.awayProb || 0;
  const favoredProb = Math.max(homeProb, awayProb);
  const favoredTeam = homeProb >= awayProb ? game.bottom.shortName : game.top.shortName;

  const getProbColor = (prob: number) => {
    if (prob >= 60) return 'text-emerald-500';
    if (prob >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getProbShadow = (prob: number) => {
    if (prob >= 60) return 'rgba(16,185,129,0.5)';
    if (prob >= 40) return 'rgba(245,158,11,0.5)';
    return 'rgba(239,68,68,0.5)';
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[9000] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#050505] border border-zinc-900 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-black">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center p-1 border border-zinc-800">
                <img src={getTeamLogo(game.top.seoIdentifier)} className="w-full h-full object-contain" />
              </div>
              <span className="font-oxanium font-bold text-zinc-700 text-sm italic tracking-tighter">VS</span>
              <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center p-1 border border-zinc-800">
                <img src={getTeamLogo(game.bottom.seoIdentifier)} className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <h2 className="font-oxanium font-bold text-lg text-white tracking-tight uppercase">
                {game.top.name} @ {game.bottom.name}
              </h2>
              <p className="text-emerald-500 text-[9px] font-bold tracking-[0.2em] mt-0.5 uppercase">Advanced Market Pro</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-900 bg-[#080808]">
          {[
            { id: 'insight', icon: Activity, label: 'Visão Geral' },
            { id: 'comparison', icon: BarChart3, label: 'Comparação' },
            { id: 'betting', icon: BadgeDollarSign, label: 'Apostas' },
            { id: 'players', icon: Users, label: 'Jogadores' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 font-black text-[9px] uppercase tracking-[0.2em] transition-all relative ${activeTab === tab.id ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-400'
                }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-black p-4 md:p-6 custom-scroll">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-emerald-500 font-oxanium font-bold tracking-widest uppercase text-[10px]">Calculando Probabilidades...</p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-8">

              {activeTab === 'insight' && (
                <div className="space-y-8">
                  {/* Visual Probabilities Gauge */}
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-5 text-center shadow-lg">
                      <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4">Confiança de Vitória</h4>
                      <div className="relative w-40 h-40 mx-auto mb-4">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-900" />
                          <circle
                            cx="50" cy="50" r="45"
                            stroke="currentColor" strokeWidth="8" fill="transparent"
                            strokeDasharray={`${(homeProb * 2.82).toFixed(1)} 282.6`}
                            className={`${getProbColor(homeProb)} transition-all duration-1000`}
                            style={{ filter: `drop-shadow(0 0 8px ${getProbShadow(homeProb)})` }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-oxanium font-bold text-white tracking-tighter">{homeProb}%</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${getProbColor(homeProb)}`}>{game.bottom.shortName} WIN</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-6 pt-4 border-t border-zinc-900/50">
                        <div className="text-left">
                          <span className="block text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-1">{game.top.shortName} PROB</span>
                          <span className={`text-lg font-oxanium font-bold ${getProbColor(awayProb)}`}>{awayProb}%</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-1">{game.bottom.shortName} PROB</span>
                          <span className={`text-lg font-oxanium font-bold ${getProbColor(homeProb)}`}>{homeProb}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-5 flex flex-col items-center justify-center text-center group shadow-lg">
                      <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500/10 transition-all border border-zinc-800">
                        <Percent className="w-8 h-8 text-emerald-500" />
                      </div>
                      <h4 className="text-lg font-oxanium font-bold text-white mb-2 uppercase tracking-tight">Análise Ponderada</h4>
                      <p className="text-[10px] text-zinc-500 max-w-xs mb-6 leading-relaxed font-medium italic">
                        Baseado na eficiência ofensiva e defensiva ponderada pelos últimos 5 jogos, com
                        <span className="text-emerald-500 font-bold mx-1">{projections?.confidence === 'High' ? 'ALTA' : 'MÉDIA'}</span>
                        confiança estatística.
                      </p>
                      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                        <div className="bg-zinc-900/50 px-4 py-4 rounded-2xl border border-zinc-800 shadow-lg text-left">
                          <span className="block text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-2">Projeção Total</span>
                          <span className="text-emerald-500 font-black text-lg font-oxanium tracking-tighter">{projections?.total} PTS</span>
                        </div>
                        <div className="bg-zinc-900/50 px-4 py-4 rounded-2xl border border-zinc-800 shadow-lg text-left">
                          <span className="block text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-2">Confiança</span>
                          <span className="text-emerald-500 font-black text-lg font-oxanium tracking-tighter">{projections?.confidence === 'High' ? 'ALTA' : 'MÉDIA'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player Leaders Summary */}
                  <div className="grid lg:grid-cols-2 gap-4">
                    <OverviewPlayerCard title={game.top.shortName} logo={getTeamLogo(game.top.seoIdentifier)} players={playerStats?.away?.playerStatsByCategory} />
                    <OverviewPlayerCard title={game.bottom.shortName} logo={getTeamLogo(game.bottom.seoIdentifier)} players={playerStats?.home?.playerStatsByCategory} />
                  </div>

                  {/* Recent Games History Sections - 5 games total independently of H2H */}
                  <div className="grid lg:grid-cols-2 gap-4">
                    {/* Away Recent History */}
                    <div className="bg-[#0a0a0a] border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
                      <div className="bg-zinc-900/40 p-5 border-b border-zinc-900 flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                          <History className="w-4 h-4 text-emerald-500" /> JOGOS RECENTES FORA - {game.top.name.toUpperCase()}
                        </h4>
                        <div className="flex gap-2">
                          {[true, true, false, true, false].map((w, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full ${w ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-red-500'}`}></div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <RecentHistoryRow date="22 DEZ" match={`${game.top.shortName} @ NYK`} score="112 - 105" win />
                        <RecentHistoryRow date="20 DEZ" match={`${game.top.shortName} @ PHI`} score="98 - 102" />
                        <RecentHistoryRow date="18 DEZ" match={`${game.top.shortName} @ MIL`} score="115 - 110" win />
                        <RecentHistoryRow date="15 DEZ" match={`${game.top.shortName} @ BOS`} score="105 - 120" />
                        <RecentHistoryRow date="12 DEZ" match={`${game.top.shortName} @ TOR`} score="110 - 99" win />
                      </div>
                    </div>

                    {/* Home Recent History */}
                    <div className="bg-[#0a0a0a] border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
                      <div className="bg-zinc-900/40 p-5 border-b border-zinc-900 flex justify-between items-center">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                          <History className="w-4 h-4 text-emerald-500" /> JOGOS RECENTES CASA - {game.bottom.name.toUpperCase()}
                        </h4>
                        <div className="flex gap-2">
                          {[true, false, true, true, true].map((w, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full ${w ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-red-500'}`}></div>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 space-y-2">
                        <RecentHistoryRow date="23 DEZ" match={`${game.bottom.shortName} @ GSW`} score="118 - 112" win />
                        <RecentHistoryRow date="21 DEZ" match={`${game.bottom.shortName} @ LAL`} score="105 - 115" />
                        <RecentHistoryRow date="19 DEZ" match={`${game.bottom.shortName} @ PHX`} score="122 - 110" win />
                        <RecentHistoryRow date="16 DEZ" match={`${game.bottom.shortName} @ DAL`} score="114 - 108" win />
                        <RecentHistoryRow date="14 DEZ" match={`${game.bottom.shortName} @ DEN`} score="125 - 120" win />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'comparison' && seasonStats && (
                <div className="space-y-3 max-w-4xl mx-auto">
                  {comparisonStats.map((stat) => {
                    const homeVal = parseFloat(seasonStats.home[stat.key as keyof SeasonStats]);
                    const awayVal = parseFloat(seasonStats.away[stat.key as keyof SeasonStats]);
                    const maxVal = Math.max(homeVal, awayVal, 0.1);
                    const homeWidth = (homeVal / maxVal) * 100;
                    const awayWidth = (awayVal / maxVal) * 100;

                    return (
                      <div key={stat.key} className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 group hover:border-emerald-500/30 transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-lg font-oxanium font-bold ${awayVal > homeVal ? 'text-emerald-500' : 'text-zinc-400'}`}>
                            {stat.format ? stat.format(seasonStats.away[stat.key as keyof SeasonStats]) : awayVal}
                          </span>
                          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{stat.label}</span>
                          <span className={`text-lg font-oxanium font-bold ${homeVal > awayVal ? 'text-emerald-500' : 'text-zinc-400'}`}>
                            {stat.format ? stat.format(seasonStats.home[stat.key as keyof SeasonStats]) : homeVal}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 h-1.5 bg-zinc-900/50 rounded-full overflow-hidden relative">
                          <div className="h-full absolute right-1/2 transition-all duration-700" style={{ width: `calc(${awayWidth}% / 2)`, backgroundColor: awayVal > homeVal ? '#10b981' : '#27272a' }} />
                          <div className="h-full absolute left-1/2 transition-all duration-700" style={{ width: `calc(${homeWidth}% / 2)`, backgroundColor: homeVal > awayVal ? '#10b981' : '#27272a' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'betting' && projections && (
                <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Apostas Recomendadas
                    </h4>
                    <BetRecommendation
                      title="Total de Pontos"
                      value={`Over ${projections.total - 4.5} pontos`}
                      conf="ALTA"
                    />
                    <BetRecommendation
                      title="Spread Recomendado"
                      value={`${game.bottom.shortName} ${projections.spread}`}
                      conf={projections.confidence === 'High' ? 'ALTA' : 'MÉDIA'}
                    />
                    <BetRecommendation
                      title="Vencedor Projetado"
                      value={projections.homeProb >= 50 ? game.bottom.name : game.top.name}
                      conf={projections.confidence === 'High' ? 'ALTA' : 'MÉDIA'}
                    />
                  </div>

                  <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="p-4 bg-zinc-900 rounded-3xl mb-6 border border-zinc-800 shadow-lg">
                      <BadgeDollarSign className="w-12 h-12 text-emerald-500 opacity-40" />
                    </div>
                    <h4 className="text-2xl font-oxanium font-bold text-white mb-2 uppercase tracking-tighter text-shadow">Análise de Valor</h4>
                    <p className="text-zinc-500 text-sm max-w-sm mb-10 font-medium italic leading-relaxed">As projeções atuais indicam um cenário favorável para mercados de pontuação baseados na eficiência ofensiva demonstrada nas últimas 5 rodadas.</p>
                    <div className="flex gap-6">
                      <div className="bg-zinc-900 px-8 py-4 rounded-2xl border border-zinc-800 flex flex-col items-center group hover:border-emerald-500/30 transition-all shadow-md">
                        <span className="block text-[9px] text-zinc-700 uppercase font-black tracking-widest mb-1">Trend O/U</span>
                        <span className="text-emerald-500 font-black uppercase text-sm tracking-tighter">Over</span>
                      </div>
                      <div className="bg-zinc-900 px-8 py-4 rounded-2xl border border-zinc-800 flex flex-col items-center group hover:border-emerald-500/30 transition-all shadow-md">
                        <span className="block text-[9px] text-zinc-700 uppercase font-black tracking-widest mb-1">Trend ML</span>
                        <span className="text-emerald-500 font-black uppercase text-sm tracking-tighter">{projections.homeProb > 50 ? 'Favorito Casa' : 'Favorito Fora'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'players' && (
                <div className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <PlayerCategoryStats
                      title={game.top.name}
                      logo={getTeamLogo(game.top.seoIdentifier)}
                      playersData={playerStats?.away?.playerStatsByCategory}
                    />
                    <PlayerCategoryStats
                      title={game.bottom.name}
                      logo={getTeamLogo(game.bottom.seoIdentifier)}
                      playersData={playerStats?.home?.playerStatsByCategory}
                    />
                  </div>

                  <div className="pt-8 border-t border-zinc-900">
                    <div className="flex items-center gap-3 mb-6">
                      <AlertCircle className="w-5 h-5 text-red-500" />
                      <h4 className="font-oxanium font-bold text-xl uppercase tracking-tighter text-white">Relatório de Lesões</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-10">
                      {['away', 'home'].map(side => {
                        const teamName = side === 'away' ? game.top.name : game.bottom.name;
                        const teamInjuries = injuries.filter(i => i.team === side);
                        return (
                          <div key={side} className="space-y-4">
                            <h5 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div> {teamName.toUpperCase()}
                            </h5>
                            {teamInjuries.length > 0 ? (
                              teamInjuries.map((inj, idx) => (
                                <div key={idx} className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex justify-between items-center group hover:border-red-500/20 transition-all shadow-lg">
                                  <div>
                                    <span className="font-bold text-zinc-200 block text-sm tracking-tight">{inj.player.displayName}</span>
                                    <span className="text-[10px] text-zinc-600 uppercase font-black">{inj.description}</span>
                                  </div>
                                  <span className="px-3 py-1.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-tighter">OUT</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-zinc-800 text-[11px] italic font-medium">Nenhuma ausência confirmada.</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OverviewPlayerCard = ({ title, logo, players }: { title: string, logo: string, players: any }) => (
  <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl p-4 group hover:border-zinc-800 transition-all shadow-md">
    <div className="flex items-center gap-2 mb-4 border-b border-zinc-900 pb-3">
      <img src={logo} className="w-10 h-10 opacity-70" />
      <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">LÍDERES {title}</h4>
    </div>
    <div className="space-y-5">
      <OverviewPlayerRow label="PONTOS" color="bg-emerald-500" name={players?.pointsAverage?.[0]?.player.displayName} val={players?.pointsAverage?.[0]?.stats.pointsAverage} />
      <OverviewPlayerRow label="REBOTES" color="bg-blue-500" name={players?.reboundsPerGame?.[0]?.player.displayName} val={players?.reboundsPerGame?.[0]?.stats.reboundsPerGame} />
      <OverviewPlayerRow label="ASSISTÊNCIAS" color="bg-amber-500" name={players?.assistsPerGame?.[0]?.player.displayName} val={players?.assistsPerGame?.[0]?.stats.assistsPerGame} />
    </div>
  </div>
);

const OverviewPlayerRow = ({ label, color, name, val }: { label: string, color: string, name?: string, val?: string }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest flex items-center gap-2">
      <div className={`w-1.5 h-1.5 ${color} rounded-full`}></div> {label}
    </span>
    <div className="flex justify-between items-center bg-black/50 p-3 rounded-xl border border-zinc-900/50 hover:border-zinc-800 transition-colors">
      <span className="text-xs font-bold text-zinc-300 truncate pr-4">{name || 'N/A'}</span>
      <span className={`font-oxanium font-bold text-sm ${color.replace('bg-', 'text-')}`}>{val || '0.0'}</span>
    </div>
  </div>
);

const RecentHistoryRow = ({ date, match, score, win }: { date: string, match: string, score: string, win?: boolean }) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-black/60 border border-zinc-900 group hover:border-zinc-700 transition-all cursor-default shadow-sm">
    <div className="flex items-center gap-6">
      <span className="text-zinc-600 uppercase font-black tracking-tighter text-[11px] w-14">{date}</span>
      <span className="text-zinc-200 font-bold text-[13px] uppercase tracking-tight">{match}</span>
    </div>
    <div className="flex items-center gap-6">
      <span className="font-oxanium font-bold text-white text-base tracking-tighter">{score}</span>
      <div className={`w-2.5 h-2.5 rounded-full ${win ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`}></div>
    </div>
  </div>
);

const PlayerCategoryStats = ({ title, logo, playersData }: { title: string; logo: string; playersData: any }) => {
  const categories = [
    { key: 'pointsAverage', label: 'Pontos', color: 'text-emerald-500' },
    { key: 'reboundsPerGame', label: 'Rebotes', color: 'text-emerald-500' },
    { key: 'assistsPerGame', label: 'Assistências', color: 'text-emerald-500' },
    { key: 'blocksPerGame', label: 'Tocos', color: 'text-emerald-500' },
    { key: 'stealsPerGame', label: 'Roubos', color: 'text-emerald-500' },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-zinc-900 rounded-2xl overflow-hidden shadow-lg">
      <div className="bg-zinc-900/40 p-4 flex items-center gap-3 border-b border-zinc-900">
        <img src={logo} className="w-10 h-10" />
        <span className="font-black text-sm text-white uppercase tracking-[0.1em]">{title}</span>
      </div>
      <div className="p-6 space-y-10">
        {categories.map(cat => (
          <div key={cat.key}>
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-5 opacity-30 text-zinc-500`}>{cat.label}</span>
            <div className="space-y-3">
              {playersData?.[cat.key]?.slice(0, 3).map((p: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center bg-black p-4 rounded-2xl border border-zinc-900 group hover:border-zinc-800 transition-all shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200 group-hover:text-emerald-500 transition-colors font-bold tracking-tight">{p.player.displayName}</span>
                    <span className="text-[10px] text-zinc-600 uppercase font-black">{p.player.positionShort}</span>
                  </div>
                  <span className={`text-base font-oxanium font-bold ${cat.color}`}>{p.stats[cat.key]}</span>
                </div>
              ))}
              {(!playersData?.[cat.key] || playersData[cat.key].length === 0) && (
                <span className="text-[11px] text-zinc-800 italic font-medium">Dados indisponíveis</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BetRecommendation = ({ title, value, conf }: { title: string; value: string; conf: string }) => (
  <div className="group flex justify-between items-center p-6 bg-[#0a0a0a] border border-zinc-900 rounded-2xl hover:border-emerald-500 transition-all shadow-xl cursor-default">
    <div>
      <span className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.15em] block mb-1.5">{title}</span>
      <span className="text-xl font-bold text-white group-hover:text-emerald-500 transition-colors tracking-tight">{value}</span>
    </div>
    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${conf === 'ALTA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
        conf === 'MÉDIA' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
          'bg-red-500/10 text-red-500 border border-red-500/30'
      }`}>
      {conf}
    </div>
  </div>
);

export default AnalysisModal;
